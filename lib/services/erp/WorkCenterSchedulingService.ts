import { createClient } from '@/lib/supabase/client';
import type {
  ProductionOrder,
  WorkCenterQueueJobExtended,
  ScheduleOrderInput,
  ScheduleOrderResult,
  OverrideCapacityInput,
  OverrideCapacityResult,
  WorkCenter
} from '@/types/erp';

export class WorkCenterSchedulingService {
  /**
   * Add working minutes adhering to the Egyptian Factory Calendar:
   * Shifts: Sunday through Thursday, 08:00 to 17:00 (12:00-13:00 Lunch Break)
   * Net productive: 480 minutes/day (08:00-12:00 and 13:00-17:00)
   * Weekends: Friday and Saturday (Rolls forward to Sunday 08:00)
   */
  static addWorkingMinutes(startDate: Date, minutesToAdd: number): Date {
    let current = new Date(startDate.getTime());
    let remainingMinutes = minutesToAdd;

    while (remainingMinutes > 0) {
      // If Friday (5) or Saturday (6), advance to Sunday 08:00
      const day = current.getUTCDay();
      if (day === 5) {
        // Friday -> add 2 days to Sunday 08:00
        current.setUTCDate(current.getUTCDate() + 2);
        current.setUTCHours(8, 0, 0, 0);
        continue;
      }
      if (day === 6) {
        // Saturday -> add 1 day to Sunday 08:00
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(8, 0, 0, 0);
        continue;
      }

      const hours = current.getUTCHours();
      const mins = current.getUTCMinutes();
      const currentMinuteOfDay = hours * 60 + mins;

      // Before 08:00 -> fast-forward to 08:00
      if (currentMinuteOfDay < 8 * 60) {
        current.setUTCHours(8, 0, 0, 0);
        continue;
      }

      // During lunch 12:00 - 13:00 -> fast-forward to 13:00
      if (currentMinuteOfDay >= 12 * 60 && currentMinuteOfDay < 13 * 60) {
        current.setUTCHours(13, 0, 0, 0);
        continue;
      }

      // After 17:00 -> advance to next day 08:00
      if (currentMinuteOfDay >= 17 * 60) {
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(8, 0, 0, 0);
        continue;
      }

      // Within Block 1: 08:00 - 12:00
      if (currentMinuteOfDay >= 8 * 60 && currentMinuteOfDay < 12 * 60) {
        const minutesAvailableInBlock = 12 * 60 - currentMinuteOfDay;
        const consume = Math.min(remainingMinutes, minutesAvailableInBlock);
        current = new Date(current.getTime() + consume * 60000);
        remainingMinutes -= consume;
        if (remainingMinutes > 0 && current.getUTCHours() === 12) {
          // Skip lunch to 13:00
          current.setUTCHours(13, 0, 0, 0);
        }
        continue;
      }

      // Within Block 2: 13:00 - 17:00
      if (currentMinuteOfDay >= 13 * 60 && currentMinuteOfDay < 17 * 60) {
        const minutesAvailableInBlock = 17 * 60 - currentMinuteOfDay;
        const consume = Math.min(remainingMinutes, minutesAvailableInBlock);
        current = new Date(current.getTime() + consume * 60000);
        remainingMinutes -= consume;
        if (remainingMinutes > 0 && current.getUTCHours() === 17) {
          // Advance to next day 08:00
          current.setUTCDate(current.getUTCDate() + 1);
          current.setUTCHours(8, 0, 0, 0);
        }
        continue;
      }
    }

    return current;
  }

  /**
   * Calculate operation duration reconciling Machine Minutes and Labor Minutes
   * Invariant:
   * - Machine cycle time is NOT parallelizable across operators
   * - Labor time scales inversely with assigned operators count
   */
  static calculateOperationDuration(
    plannedQuantity: number,
    workCenter: { hourly_capacity?: number; assigned_operators_count?: number },
    step?: { labor_minutes?: number; machine_minutes?: number; setup_minutes?: number }
  ): number {
    const laborMins = Number(step?.labor_minutes || 0);
    const machineMins = Number(step?.machine_minutes || 0);
    const setupMins = Number(step?.setup_minutes || 0);
    const operators = Math.max(1, Number(workCenter.assigned_operators_count || 1));

    if (laborMins > 0 || machineMins > 0) {
      // Deterministic separation: Setup + Machine Cycle + (Quantity * Labor / Operators)
      const laborTotal = (plannedQuantity * laborMins) / operators;
      return Math.ceil(setupMins + machineMins + laborTotal);
    }

    // Fallback: Throughput-based duration = (Quantity / Hourly Capacity) * 60
    const hourlyCapacity = Math.max(1, Number(workCenter.hourly_capacity || 10));
    return Math.ceil((plannedQuantity / hourlyCapacity) * 60);
  }

  /**
   * Finite-Capacity Sequential Forward Scheduling Engine
   * Strictly enforces:
   * 1. Calendar awareness (08:00-17:00, Sun-Thu, Fri-Sat excluded)
   * 2. Sequential stage precedence (Stage i cannot start before Stage i-1 completes)
   * 3. Non-overlapping work center queue slots (Database exclusion constraint compliant)
   * 4. Target-date feasibility gating (Transitions to CAPACITY_BLOCKED on overdue risk)
   * 5. Snapshot stamping of routing parameters into work_center_queue_jobs
   */
  static async scheduleOrder(
    input: ScheduleOrderInput,
    customClient?: any
  ): Promise<ScheduleOrderResult> {
    const supabase = customClient || createClient();
    const orderId = input.order_id;

    // 1. Idempotency Check
    if (input.idempotency_key) {
      const { data: existingRecord } = await supabase
        .from('idempotency_records')
        .select('*')
        .eq('key', input.idempotency_key)
        .single();

      if (existingRecord) {
        return existingRecord.response_payload as ScheduleOrderResult;
      }
    }

    // 2. Fetch Order
    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`404 Not Found: Production Order #${orderId} not found.`);
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'READY_FOR_EXECUTION') {
      throw new Error(
        `422 Unprocessable Entity: Only orders in CONFIRMED status can be scheduled. Current status: '${order.status}'.`
      );
    }

    // 3. Resolve Work Centers
    const { data: workCenters, error: wcErr } = await supabase
      .from('work_centers')
      .select('*')
      .eq('is_active', true);

    if (wcErr || !workCenters || workCenters.length === 0) {
      throw new Error(`500 Internal Error: No active work centers found.`);
    }

    const wcMap = new Map<string, any>(workCenters.map((w: any) => [w.code, w]));
    const wcIdMap = new Map<string, any>(workCenters.map((w: any) => [w.id, w]));

    // 4. Resolve Routing Template Steps or Fallback to Canonical 8 Stages
    let stagesToSchedule: Array<{
      seq: number;
      stage: string;
      work_center_id: string;
      labor_minutes: number;
      machine_minutes: number;
      setup_minutes: number;
    }> = [];

    const { data: routingTemplates } = await supabase
      .from('routing_templates')
      .select('id, variant_id, product_id, steps:routing_steps(*)')
      .or(`variant_id.eq.${order.variant_id},product_id.eq.${order.product_id}`)
      .order('variant_id', { ascending: false });

    if (routingTemplates && routingTemplates.length > 0 && routingTemplates[0].steps?.length > 0) {
      const activeTemplate = routingTemplates[0];
      const sortedSteps = [...activeTemplate.steps].sort((a: any, b: any) => a.sequence_no - b.sequence_no);

      stagesToSchedule = sortedSteps.map((s: any) => ({
        seq: s.sequence_no,
        stage: s.stage_code,
        work_center_id: s.work_center_id,
        labor_minutes: s.labor_minutes || 0,
        machine_minutes: s.machine_minutes || 0,
        setup_minutes: s.setup_minutes || 0
      }));
    } else {
      // Standard Canonical 8 Silver Factory Stages Fallback
      const standardStages = [
        { seq: 10, stage: 'CASTING', code: 'WC-CASTING', mach: 30, lab: 2 },
        { seq: 20, stage: 'CLEANING', code: 'WC-CLEANING', mach: 15, lab: 1 },
        { seq: 30, stage: 'SETTING', code: 'WC-SETTING', mach: 0, lab: 15 },
        { seq: 40, stage: 'POLISHING', code: 'WC-POLISHING', mach: 0, lab: 8 },
        { seq: 50, stage: 'RHODIUM', code: 'WC-RHODIUM', mach: 20, lab: 2 },
        { seq: 60, stage: 'HALLMARK', code: 'WC-HALLMARK', mach: 5, lab: 1 },
        { seq: 70, stage: 'QC', code: 'WC-QC', mach: 0, lab: 3 },
        { seq: 80, stage: 'PACKAGING', code: 'WC-PACKAGING', mach: 0, lab: 2 }
      ];

      stagesToSchedule = standardStages.map((s) => {
        const wc = wcMap.get(s.code) || workCenters[0];
        return {
          seq: s.seq,
          stage: s.stage,
          work_center_id: wc.id,
          labor_minutes: s.lab,
          machine_minutes: s.mach,
          setup_minutes: 0
        };
      });
    }

    // 5. Query Existing Scheduled Jobs Across All Work Centers to Prevent Collisions
    const { data: existingJobs } = await supabase
      .from('work_center_queue_jobs')
      .select('id, work_center_id, scheduled_start_time, scheduled_end_time, status')
      .neq('status', 'CANCELLED')
      .not('scheduled_start_time', 'is', null)
      .not('scheduled_end_time', 'is', null);

    // Group existing booked windows by work_center_id
    const bookedWindowsByWc = new Map<string, Array<{ start: number; end: number }>>();
    for (const job of existingJobs || []) {
      if (!bookedWindowsByWc.has(job.work_center_id)) {
        bookedWindowsByWc.set(job.work_center_id, []);
      }
      bookedWindowsByWc.get(job.work_center_id)!.push({
        start: new Date(job.scheduled_start_time).getTime(),
        end: new Date(job.scheduled_end_time).getTime()
      });
    }

    // Helper: Find earliest contiguous free window on a work center
    const findEarliestWindow = (
      wcId: string,
      earliestCandidateTime: Date,
      durationMinutes: number
    ): { start: Date; end: Date } => {
      let candidateStart = new Date(earliestCandidateTime.getTime());
      const existingBookings = (bookedWindowsByWc.get(wcId) || []).sort((a, b) => a.start - b.start);

      while (true) {
        // Align candidate start to calendar working hours
        candidateStart = this.alignToWorkingHours(candidateStart);
        const candidateEnd = this.addWorkingMinutes(candidateStart, durationMinutes);

        const candStartMs = candidateStart.getTime();
        const candEndMs = candidateEnd.getTime();

        // Check for collision with any existing booking
        const collision = existingBookings.find((b) => candStartMs < b.end && candEndMs > b.start);
        if (!collision) {
          return { start: candidateStart, end: candidateEnd };
        }

        // Advance candidate start past the colliding booking's end time
        candidateStart = new Date(collision.end);
      }
    };

    // 6. Forward Simulation Sequence
    let predecessorFinish = new Date(order.start_date || new Date().toISOString());
    const scheduledJobsPayload: any[] = [];

    for (const stage of stagesToSchedule) {
      const wc = wcIdMap.get(stage.work_center_id) || workCenters[0];
      const durationMins = this.calculateOperationDuration(order.planned_quantity, wc, {
        labor_minutes: stage.labor_minutes,
        machine_minutes: stage.machine_minutes,
        setup_minutes: stage.setup_minutes
      });

      const slot = findEarliestWindow(stage.work_center_id, predecessorFinish, durationMins);

      scheduledJobsPayload.push({
        order_id: orderId,
        work_center_id: stage.work_center_id,
        sequence_no: stage.seq,
        stage_code: stage.stage,
        status: 'QUEUED',
        estimated_minutes: durationMins,
        scheduled_start_time: slot.start.toISOString(),
        scheduled_end_time: slot.end.toISOString(),
        scheduling_status: 'SCHEDULED'
      });

      // Update local booked cache so subsequent stages in the same order don't collide if work centers are shared
      if (!bookedWindowsByWc.has(stage.work_center_id)) {
        bookedWindowsByWc.set(stage.work_center_id, []);
      }
      bookedWindowsByWc.get(stage.work_center_id)!.push({
        start: slot.start.getTime(),
        end: slot.end.getTime()
      });

      predecessorFinish = slot.end;
    }

    const scheduledStart = scheduledJobsPayload[0].scheduled_start_time;
    const scheduledFinish = scheduledJobsPayload[scheduledJobsPayload.length - 1].scheduled_end_time;
    const targetDate = input.target_date || order.target_date;

    let targetDateBreached = false;
    let overrunDays = 0;

    if (targetDate) {
      const targetMs = new Date(targetDate).getTime();
      const finishMs = new Date(scheduledFinish).getTime();
      if (finishMs > targetMs) {
        targetDateBreached = true;
        overrunDays = Math.ceil((finishMs - targetMs) / (1000 * 60 * 60 * 24));
      }
    }

    // 7. Feasibility Gating
    if (targetDateBreached) {
      // Transition to CAPACITY_BLOCKED: Material remains RESERVED, but scheduling requires Manager Override
      await supabase
        .from('production_orders')
        .update({
          scheduling_status: 'CAPACITY_BLOCKED',
          target_date_breached: true
        })
        .eq('id', orderId);

      await supabase.from('production_order_timeline').insert([
        {
          order_id: orderId,
          from_status: order.scheduling_status || 'UNSCHEDULED',
          to_status: 'CAPACITY_BLOCKED',
          action: 'SCHEDULE_CAPACITY_BLOCKED',
          actor_id: input.actor_id || null,
          details: `Target date breached by ${overrunDays} days (Finish: ${scheduledFinish}, Target: ${targetDate}). Requires Manager Override.`
        }
      ]);

      await supabase.from('event_store').insert([
        {
          event_name: 'ProductionCapacityBlocked',
          aggregate_type: 'production_order',
          aggregate_id: orderId,
          payload: {
            order_id: orderId,
            overrun_days: overrunDays,
            scheduled_finish: scheduledFinish,
            target_date: targetDate
          }
        }
      ]);

      return {
        order_id: orderId,
        scheduling_status: 'CAPACITY_BLOCKED',
        target_date_breached: true,
        scheduled_start: scheduledStart,
        scheduled_finish: scheduledFinish,
        target_date: targetDate,
        overrun_days: overrunDays,
        queue_jobs: [],
        timestamp: new Date().toISOString()
      };
    }

    // 8. Commit Queue Jobs to Database
    // Clear any previous scheduled jobs for this order
    await supabase.from('work_center_queue_jobs').delete().eq('order_id', orderId);

    const { data: insertedJobs, error: insertErr } = await supabase
      .from('work_center_queue_jobs')
      .insert(scheduledJobsPayload)
      .select();

    if (insertErr) {
      if (insertErr.code === '23P01' || insertErr.message?.includes('ex_work_center_no_time_overlap')) {
        throw new Error(
          `409 Conflict: Work center slot contention detected. Another order booked the slot concurrently.`
        );
      }
      throw new Error(`Failed to insert scheduled queue jobs: ${insertErr.message}`);
    }

    // 9. Update Order Scheduling Status & Check Terminal Handoff Gate
    const nextOrderStatus = order.reservation_status === 'RESERVED' ? 'READY_FOR_EXECUTION' : order.status;

    await supabase
      .from('production_orders')
      .update({
        scheduling_status: 'SCHEDULED',
        target_date_breached: false,
        status: nextOrderStatus
      })
      .eq('id', orderId);

    // 10. Audit Timeline & Events
    await supabase.from('production_order_timeline').insert([
      {
        order_id: orderId,
        from_status: order.scheduling_status || 'UNSCHEDULED',
        to_status: 'SCHEDULED',
        action: 'SCHEDULE_ORDER',
        actor_id: input.actor_id || null,
        details: `Scheduled ${scheduledJobsPayload.length} operations from ${scheduledStart} to ${scheduledFinish}.`
      }
    ]);

    await supabase.from('event_store').insert([
      {
        event_name: 'ProductionScheduled',
        aggregate_type: 'production_order',
        aggregate_id: orderId,
        payload: {
          order_id: orderId,
          scheduled_start: scheduledStart,
          scheduled_finish: scheduledFinish
        }
      }
    ]);

    if (nextOrderStatus === 'READY_FOR_EXECUTION') {
      await supabase.from('event_store').insert([
        {
          event_name: 'ProductionReadyForExecution',
          aggregate_type: 'production_order',
          aggregate_id: orderId,
          payload: { order_id: orderId, timestamp: new Date().toISOString() }
        }
      ]);
    }

    const result: ScheduleOrderResult = {
      order_id: orderId,
      scheduling_status: 'SCHEDULED',
      target_date_breached: false,
      scheduled_start: scheduledStart,
      scheduled_finish: scheduledFinish,
      target_date: targetDate,
      queue_jobs: insertedJobs || [],
      timestamp: new Date().toISOString()
    };

    if (input.idempotency_key) {
      await supabase.from('idempotency_records').insert([
        {
          key: input.idempotency_key,
          action: 'SCHEDULE_ORDER',
          resource_id: orderId,
          response_payload: result,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }

    return result;
  }

  /**
   * Manager Capacity Override: Authorizes target date breach
   * Invariant: Authorizes delivery delay; physical equipment collision is NEVER permitted.
   */
  static async overrideCapacity(
    input: OverrideCapacityInput,
    customClient?: any
  ): Promise<OverrideCapacityResult> {
    const supabase = customClient || createClient();
    const orderId = input.order_id;

    if (!input.justification || input.justification.trim().length === 0) {
      throw new Error(`422 Unprocessable Entity: Mandatory justification required for capacity override.`);
    }

    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) throw new Error(`404 Not Found: Production Order #${orderId} not found.`);

    // Perform scheduling simulation ignoring target date breach
    const scheduleResult = await this.scheduleOrder(
      {
        order_id: orderId,
        actor_id: input.actor_id,
        target_date: undefined // Force forward scheduling
      },
      supabase
    );

    // Update override fields
    const nextOrderStatus = order.reservation_status === 'RESERVED' ? 'READY_FOR_EXECUTION' : order.status;

    await supabase
      .from('production_orders')
      .update({
        scheduling_status: 'SCHEDULED',
        target_date_breached: true,
        override_authorized_by: input.actor_id,
        status: nextOrderStatus
      })
      .eq('id', orderId);

    await supabase.from('production_order_timeline').insert([
      {
        order_id: orderId,
        from_status: 'CAPACITY_BLOCKED',
        to_status: 'SCHEDULED',
        action: 'OVERRIDE_CAPACITY',
        actor_id: input.actor_id,
        details: `Manager Override authorized by #${input.actor_id}. Justification: ${input.justification}`
      }
    ]);

    return {
      order_id: orderId,
      scheduling_status: 'SCHEDULED',
      override_authorized_by: input.actor_id,
      justification: input.justification,
      queue_jobs: scheduleResult.queue_jobs,
      timestamp: new Date().toISOString()
    };
  }

  private static alignToWorkingHours(date: Date): Date {
    const d = new Date(date.getTime());
    const day = d.getUTCDay();

    // Weekend (Friday or Saturday) -> advance to Sunday 08:00
    if (day === 5) {
      d.setUTCDate(d.getUTCDate() + 2);
      d.setUTCHours(8, 0, 0, 0);
      return d;
    }
    if (day === 6) {
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(8, 0, 0, 0);
      return d;
    }

    const hours = d.getUTCHours();
    const mins = d.getUTCMinutes();
    const minuteOfDay = hours * 60 + mins;

    if (minuteOfDay < 8 * 60) {
      d.setUTCHours(8, 0, 0, 0);
    } else if (minuteOfDay >= 12 * 60 && minuteOfDay < 13 * 60) {
      d.setUTCHours(13, 0, 0, 0);
    } else if (minuteOfDay >= 17 * 60) {
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(8, 0, 0, 0);
      return this.alignToWorkingHours(d);
    }

    return d;
  }
}
