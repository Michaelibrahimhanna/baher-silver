'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  Barcode,
  Camera,
  Search,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  CreditCard,
  Send,
  Printer,
  ShieldCheck,
  Scale,
  Sparkles,
  Receipt,
  FileText,
  Clock,
  User,
  Plus,
  ArrowRight,
  ArrowLeftRight,
  Wallet,
  UserCheck,
  UserPlus,
  X,
  RefreshCw,
  Percent,
  Tag,
  KeyRound,
  Lock
} from 'lucide-react';
import { MobileBarcodeScanner } from '@/components/admin/pos/MobileBarcodeScanner';
import type { POSSaleTransaction, POSCashShift, POSZReport } from '@/lib/services/pos/types';
import { getPosTerminology } from '@/lib/i18n/posTerminology';

interface CartLine {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  profileType: 'SILVER_JEWELRY' | 'NON_SILVER_RETAIL';
  serialNumber?: string;
  purity?: string;
  weightGrams: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  weightAuditRecord?: any;
}

export default function POSConsolePage() {
  const params = useParams();
  const locale = ((params?.locale as string) || 'ar') as 'ar' | 'en';
  const t = getPosTerminology(locale);
  const isRtl = locale === 'ar';

  const [activeShift, setActiveShift] = React.useState<POSCashShift | null>(null);
  const [shiftLoading, setShiftLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState('');
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);

  // Cart State
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [globalDiscount, setGlobalDiscount] = React.useState(0);

  // Weight & Scale Verification State (Silver OS)
  const [isWeightModalOpen, setIsWeightModalOpen] = React.useState(false);
  const [activeWeightCartIndex, setActiveWeightCartIndex] = React.useState<number | null>(null);
  const [weightSource, setWeightSource] = React.useState<'SCALE' | 'BARCODE' | 'MANUAL'>('SCALE');
  const [weightGrossInput, setWeightGrossInput] = React.useState<number | ''>('');
  const [weightStoneInput, setWeightStoneInput] = React.useState<number | ''>(0);
  const [manualReasonInput, setManualReasonInput] = React.useState<'TEST' | 'SCALE_FAILURE' | 'READING_CORRECTION'>('SCALE_FAILURE');
  const [weightManagerEmail, setWeightManagerEmail] = React.useState('');
  const [weightManagerPassword, setWeightManagerPassword] = React.useState('');
  const [weightLoading, setWeightLoading] = React.useState(false);
  const [weightError, setWeightError] = React.useState<string | null>(null);
  const [weightSuccessRecord, setWeightSuccessRecord] = React.useState<any | null>(null);
  const [simulatedScaleWeight, setSimulatedScaleWeight] = React.useState<number>(14.25);

  // Discount & Manager Override State (Phase 4B.4)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = React.useState(false);
  const [discountType, setDiscountType] = React.useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValueInput, setDiscountValueInput] = React.useState<number | ''>('');
  const [discountReasonInput, setDiscountReasonInput] = React.useState('');
  const [discountLoading, setDiscountLoading] = React.useState(false);
  const [discountError, setDiscountError] = React.useState<string | null>(null);
  const [discountSuccessMessage, setDiscountSuccessMessage] = React.useState<string | null>(null);

  // Manager Override State
  const [managerEmailInput, setManagerEmailInput] = React.useState('');
  const [managerPasswordInput, setManagerPasswordInput] = React.useState('');
  const [managerOverrideToken, setManagerOverrideToken] = React.useState<string | null>(null);
  const [managerOverrideDetails, setManagerOverrideDetails] = React.useState<{
    id: string;
    name: string;
    role: string;
    reason: string;
    approvedDiscount: number;
  } | null>(null);

  // Payment Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'CASH' | 'CARD' | 'INSTAPAY' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = React.useState<number>(0);
  const [splitCash, setSplitCash] = React.useState<number>(0);
  const [splitCard, setSplitCard] = React.useState<number>(0);
  const [splitInstapay, setSplitInstapay] = React.useState<number>(0);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);

  // Success / Receipt Modal
  const [completedTransaction, setCompletedTransaction] = React.useState<POSSaleTransaction | null>(null);

  // Shift Modals
  const [isOpenShiftModal, setIsOpenShiftModal] = React.useState(false);
  const [isCloseShiftModal, setIsCloseShiftModal] = React.useState(false);
  const [openingFloatInput, setOpeningFloatInput] = React.useState(1500);
  const [declaredCashInput, setDeclaredCashInput] = React.useState(0);
  const [closingNotesInput, setClosingNotesInput] = React.useState('');
  const [zReportData, setZReportData] = React.useState<POSZReport | null>(null);

  // Return Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = React.useState(false);
  const [returnReceiptInput, setReturnReceiptInput] = React.useState('');
  const [returnReasonInput, setReturnReasonInput] = React.useState('Customer requested refund');
  const [refundMethodInput, setRefundMethodInput] = React.useState<'CASH' | 'CARD'>('CASH');
  const [returnLoading, setReturnLoading] = React.useState(false);
  const [returnResult, setReturnResult] = React.useState<any | null>(null);

  // Cash Movement Modal State (Slice 4B.3)
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = React.useState(false);
  const [cashMovementType, setCashMovementType] = React.useState<'CASH_OUT' | 'EXPENSE' | 'SAFE_DROP'>('CASH_OUT');
  const [cashMovementAmount, setCashMovementAmount] = React.useState<number | ''>('');
  const [cashMovementReason, setCashMovementReason] = React.useState('');
  const [cashMovementLoading, setCashMovementLoading] = React.useState(false);
  const [cashMovementResult, setCashMovementResult] = React.useState<any | null>(null);
  const [cashMovementError, setCashMovementError] = React.useState<string | null>(null);

  // Customer Master Attachment State
  const [attachedCustomer, setAttachedCustomer] = React.useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = React.useState('');
  const [customerSearchResults, setCustomerSearchResults] = React.useState<any[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
  const [customerSearching, setCustomerSearching] = React.useState(false);

  // Multi-Match Product Selection State
  const [isMultiMatchModalOpen, setIsMultiMatchModalOpen] = React.useState(false);
  const [multiMatchResults, setMultiMatchResults] = React.useState<any[]>([]);

  // Serialized Piece Selection State
  const [isPieceModalOpen, setIsPieceModalOpen] = React.useState(false);
  const [pendingPieceProduct, setPendingPieceProduct] = React.useState<any | null>(null);
  const [availablePiecesForProduct, setAvailablePiecesForProduct] = React.useState<any[]>([]);

  const handleSearchCustomers = async (q: string) => {
    setCustomerSearchQuery(q);
    if (!q.trim()) {
      setCustomerSearchResults([]);
      return;
    }
    setCustomerSearching(true);
    try {
      const res = await fetch(`/api/customers?query=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.success) {
        setCustomerSearchResults(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to search customers:', err);
    } finally {
      setCustomerSearching(false);
    }
  };

  // Load Active Shift on Mount
  const fetchActiveShift = React.useCallback(async () => {
    try {
      setShiftLoading(true);
      const res = await fetch('/api/pos/shifts?terminalId=POS-01');
      const data = await res.json();
      if (data.success && data.shift) {
        setActiveShift(data.shift);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error('Failed to fetch active shift:', err);
    } finally {
      setShiftLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const finalTotal = Math.max(0, subtotal - globalDiscount);
  const totalSilverWeight = cart
    .filter((i) => i.profileType === 'SILVER_JEWELRY')
    .reduce((acc, item) => acc + item.weightGrams * item.quantity, 0);

  // Computed Discount for Modal Inputs
  const computedDiscountAmount = React.useMemo(() => {
    if (!discountValueInput || Number(discountValueInput) <= 0) return 0;
    if (discountType === 'PERCENT') {
      return Number(((subtotal * Number(discountValueInput)) / 100).toFixed(2));
    }
    return Number(Number(discountValueInput).toFixed(2));
  }, [subtotal, discountType, discountValueInput]);

  const effectivePercent = subtotal > 0 ? (computedDiscountAmount / subtotal) * 100 : 0;
  const isOverCashierLimit =
    computedDiscountAmount > 0 &&
    (effectivePercent > 5.0 && computedDiscountAmount > 150.0);

  // Apply Cashier Standard Discount
  const handleApplyCashierDiscount = () => {
    setDiscountError(null);
    if (computedDiscountAmount <= 0) {
      setDiscountError('Please enter a valid discount amount.');
      return;
    }
    if (computedDiscountAmount > subtotal) {
      setDiscountError(`Discount (${computedDiscountAmount} EGP) cannot exceed subtotal (${subtotal} EGP).`);
      return;
    }
    if (isOverCashierLimit) {
      setDiscountError('Discount exceeds cashier authority. Manager approval is required.');
      return;
    }

    setGlobalDiscount(computedDiscountAmount);
    setManagerOverrideToken(null);
    setManagerOverrideDetails(null);
    setIsDiscountModalOpen(false);
  };

  // Authorize Manager Override
  const handleAuthorizeManagerOverride = async () => {
    setDiscountError(null);
    setDiscountSuccessMessage(null);

    if (!managerEmailInput.trim() || !managerPasswordInput) {
      setDiscountError('Manager email and password are required.');
      return;
    }

    if (!discountReasonInput.trim()) {
      setDiscountError('Reason is mandatory for manager discount override.');
      return;
    }

    if (computedDiscountAmount <= 0) {
      setDiscountError('Please enter a valid discount amount.');
      return;
    }

    setDiscountLoading(true);
    try {
      const res = await fetch('/api/pos/discounts/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerEmail: managerEmailInput.trim(),
          managerPassword: managerPasswordInput,
          requestedDiscount: computedDiscountAmount,
          discountReason: discountReasonInput.trim(),
          subtotal
        })
      });

      const data = await res.json();
      if (!data.success) {
        setDiscountError(data.error || 'Manager override authorization failed.');
        return;
      }

      setManagerOverrideToken(data.overrideToken);
      setManagerOverrideDetails({
        id: data.manager.id,
        name: data.manager.name,
        role: data.manager.role,
        reason: discountReasonInput.trim(),
        approvedDiscount: data.approvedDiscount
      });
      setGlobalDiscount(computedDiscountAmount);
      setManagerPasswordInput(''); // SECURITY: clear password immediately
      setDiscountSuccessMessage(`Approved by ${data.manager.name} (${data.manager.role})`);

      setTimeout(() => {
        setIsDiscountModalOpen(false);
        setDiscountSuccessMessage(null);
      }, 800);
    } catch (err: any) {
      setDiscountError(err.message || 'Authorization failed.');
    } finally {
      setDiscountLoading(false);
    }
  };

  // Remove Applied Discount
  const handleRemoveDiscount = () => {
    setGlobalDiscount(0);
    setDiscountValueInput('');
    setDiscountReasonInput('');
    setManagerOverrideToken(null);
    setManagerOverrideDetails(null);
  };

  // Weight Modal Helpers (Silver OS)
  const openWeightModalForCartItem = (idx: number) => {
    const item = cart[idx];
    if (!item) return;
    setActiveWeightCartIndex(idx);
    setWeightGrossInput(item.weightGrams);
    setWeightStoneInput(0);
    setWeightSource('SCALE');
    setWeightError(null);
    setWeightSuccessRecord(null);
    setWeightManagerEmail('');
    setWeightManagerPassword('');
    setIsWeightModalOpen(true);
  };

  const handleVerifyWeight = async () => {
    if (activeWeightCartIndex === null || !cart[activeWeightCartIndex]) return;
    const item = cart[activeWeightCartIndex];

    setWeightLoading(true);
    setWeightError(null);
    setWeightSuccessRecord(null);

    const gross = weightSource === 'SCALE' ? simulatedScaleWeight : Number(weightGrossInput || 0);
    const stone = Number(weightStoneInput || 0);

    try {
      const res = await fetch('/api/pos/weight/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: weightSource,
          grossWeightGrams: gross,
          stoneWeightGrams: stone,
          manualReason: weightSource === 'MANUAL' ? manualReasonInput : undefined,
          sku: item.sku,
          serialNumber: item.serialNumber,
          managerEmail: weightManagerEmail.trim() || undefined,
          managerPassword: weightManagerPassword || undefined
        })
      });

      const data = await res.json();
      if (!data.success) {
        setWeightError(data.message || data.error || 'Weight verification failed.');
        return;
      }

      setWeightSuccessRecord(data.record);
      const netWeight = data.record.net_weight_grams;

      // Update cart line with verified net weight & recalculated price
      setCart((prev) => {
        const next = [...prev];
        const line = { ...next[activeWeightCartIndex] };
        line.weightGrams = netWeight;
        line.weightAuditRecord = data.record;

        if (line.profileType === 'SILVER_JEWELRY') {
          const spotRate = line.purity === '999' ? 60 : line.purity === '900' ? 54 : 55.5;
          const metalVal = netWeight * spotRate;
          const labor = 35;
          line.unitPrice = Math.round(metalVal + labor);
          line.totalPrice = line.unitPrice * line.quantity - line.discount;
        }
        next[activeWeightCartIndex] = line;
        return next;
      });

      setTimeout(() => {
        setIsWeightModalOpen(false);
        setWeightSuccessRecord(null);
      }, 1000);
    } catch (err: any) {
      setWeightError(err.message || 'Network error during weight verification.');
    } finally {
      setWeightLoading(false);
    }
  };

  // Cart Quantity Updates
  const updateCartQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => {
      const copy = [...prev];
      const line = copy[index];
      if (!line) return prev;
      // Serialized items cannot exceed quantity 1
      if (line.profileType === 'SILVER_JEWELRY' && newQty > 1) {
        return prev;
      }
      const quantity = line.profileType === 'SILVER_JEWELRY' ? 1 : newQty;
      const totalPrice = line.unitPrice * quantity;
      copy[index] = { ...line, quantity, totalPrice };
      return copy;
    });
  };

  // Add Product to Cart with Profile-Specific Rules
  const addProductToCart = (prod: any, piece?: any, requestedQty: number = 1) => {
    // Non-Silver Retail merchandise
    if (prod.profile_type === 'NON_SILVER_RETAIL') {
      const existingIdx = cart.findIndex((c) => c.productId === prod.id && c.profileType === 'NON_SILVER_RETAIL');
      if (existingIdx >= 0) {
        updateCartQuantity(existingIdx, cart[existingIdx].quantity + requestedQty);
        setSearchInput('');
        return;
      }
      const unitPrice = prod.price || prod.selling_price || 35;
      const weight = prod.package_weight_grams || 0;
      const newCartLine: CartLine = {
        productId: prod.id,
        sku: prod.sku || `SKU-${prod.id}`,
        barcode: prod.barcode || `EAN-${prod.id}`,
        name: prod.name?.en || prod.name?.ar || 'Retail Product',
        profileType: 'NON_SILVER_RETAIL',
        serialNumber: undefined,
        purity: undefined,
        weightGrams: weight,
        quantity: requestedQty,
        unitPrice,
        discount: 0,
        totalPrice: unitPrice * requestedQty
      };
      setCart((prev) => [...prev, newCartLine]);
      setSearchInput('');
      return;
    }

    // Serialized Silver Jewelry
    const activePiece =
      piece ||
      (prod.pieces && prod.pieces.find((p: any) => p.lifecycle_status === 'IN_SHOWCASE' || p.lifecycle_status === 'IN_VAULT'));

    if (activePiece && cart.some((c) => c.serialNumber === activePiece.serial_number)) {
      setLookupError(`Piece "${activePiece.serial_number}" is already in the cart.`);
      return;
    }

    const weight = activePiece?.current_weight_grams || prod.weight_grams || 8.0;
    const spotRate = prod.purity === '999' ? 60 : prod.purity === '900' ? 54 : 55.5;
    const metalVal = weight * spotRate;
    const labor = prod.labor_cost || 35;
    const unitPrice = Math.round(metalVal + labor);

    const newCartLine: CartLine = {
      productId: prod.id,
      sku: prod.sku || `SKU-${prod.id}`,
      barcode: activePiece?.barcode || prod.barcode || searchInput.trim(),
      name: prod.name?.en || prod.name?.ar || 'Silver Product',
      profileType: 'SILVER_JEWELRY',
      serialNumber: activePiece?.serial_number,
      purity: prod.purity || '925',
      weightGrams: weight,
      quantity: 1,
      unitPrice,
      discount: 0,
      totalPrice: unitPrice
    };

    setCart((prev) => [...prev, newCartLine]);
    setSearchInput('');
  };

  // Barcode / Product / Piece Lookup Handler
  const handleBarcodeLookup = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const query = (overrideQuery || searchInput).trim();
    if (!query) return;

    setLookupLoading(true);
    setLookupError(null);

    try {
      const res = await fetch(`/api/pos/lookup?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.success) {
        setLookupError(data.error || 'Product not found');
        return;
      }

      // Handle Multiple Matches (Keyword Search)
      if (data.type === 'MULTIPLE_MATCHES') {
        setMultiMatchResults(data.matches || []);
        setIsMultiMatchModalOpen(true);
        return;
      }

      // Handle Direct Matches
      if (data.type === 'PRODUCT_MATCH' || data.type === 'BARCODE_MATCH' || data.type === 'SERIAL_MATCH') {
        const prod = data.product;
        const piece = data.piece;
        const availablePieces = data.available_pieces || [];

        // If serialized silver jewelry has multiple physical pieces in stock and none explicitly requested
        if (prod.profile_type === 'SILVER_JEWELRY' && availablePieces.length > 1 && !piece?.serial_number) {
          setPendingPieceProduct(prod);
          setAvailablePiecesForProduct(availablePieces);
          setIsPieceModalOpen(true);
          return;
        }

        addProductToCart(prod, piece);
      }
    } catch (err: any) {
      setLookupError(err.message || 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Open Shift
  const handleOpenShift = async () => {
    try {
      const res = await fetch('/api/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: 'POS-01',
          branchId: 'branch-cairo',
          openingFloat: openingFloatInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.shift);
        setIsOpenShiftModal(false);
      } else {
        await fetchActiveShift();
        setIsOpenShiftModal(false);
      }
    } catch (err) {
      console.error('Error opening shift', err);
      await fetchActiveShift();
      setIsOpenShiftModal(false);
    }
  };

  // Close Shift & Generate Z-Report
  const handleCloseShift = async () => {
    if (!activeShift) return;
    try {
      const res = await fetch('/api/pos/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          declaredClosingCash: declaredCashInput,
          closingNotes: closingNotesInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setZReportData(data.zReport);
        setActiveShift(null);
        setIsCloseShiftModal(false);
      } else {
        alert(data.error || 'Failed to close shift');
      }
    } catch (err) {
      alert('Error closing shift');
    }
  };

  // Process Checkout
  const handleExecuteCheckout = async () => {
    if (!activeShift) {
      alert('Must have an active cashier shift to checkout.');
      return;
    }
    if (cart.length === 0) return;

    setCheckoutSubmitting(true);
    try {
      const payload = {
        shiftId: activeShift.id,
        terminalId: activeShift.terminal_id,
        branchId: activeShift.branch_id,
        paymentMethod,
        cashAmount: paymentMethod === 'CASH' ? finalTotal : paymentMethod === 'SPLIT' ? splitCash : 0,
        cardAmount: paymentMethod === 'CARD' ? finalTotal : paymentMethod === 'SPLIT' ? splitCard : 0,
        instapayAmount: paymentMethod === 'INSTAPAY' ? finalTotal : paymentMethod === 'SPLIT' ? splitInstapay : 0,
        discountAmount: globalDiscount,
        discountReason: discountReasonInput || managerOverrideDetails?.reason || undefined,
        managerOverrideToken: managerOverrideToken || undefined,
        customerId: attachedCustomer?.id || undefined,
        customerName: attachedCustomer?.name || undefined,
        customerPhone: attachedCustomer?.phone || undefined,
        idempotencyKey: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        items: cart.map((c) => ({
          productId: c.productId,
          barcode: c.barcode,
          serialNumber: c.serialNumber,
          quantity: c.quantity,
          customWeightGrams: c.weightGrams,
          discountAmount: c.discount
        }))
      };

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setCompletedTransaction(data.transaction);
        setCart([]);
        setAttachedCustomer(null);
        setGlobalDiscount(0);
        setManagerOverrideToken(null);
        setManagerOverrideDetails(null);
        setDiscountValueInput('');
        setDiscountReasonInput('');
        setIsCheckoutOpen(false);
        fetchActiveShift(); // Refresh drawer totals
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Process Return
  const handleExecuteReturn = async () => {
    if (!activeShift) {
      alert('Active cashier shift required for refund.');
      return;
    }
    if (!returnReceiptInput.trim()) return;

    setReturnLoading(true);
    try {
      const res = await fetch('/api/pos/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          terminalId: activeShift.terminal_id,
          branchId: activeShift.branch_id,
          originalSaleId: returnReceiptInput.trim(),
          returnReason: returnReasonInput,
          refundMethod: refundMethodInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setReturnResult(data);
        fetchActiveShift();
      } else {
        alert(data.error || 'Return failed');
      }
    } catch (err: any) {
      alert(err.message || 'Return execution failed');
    } finally {
      setReturnLoading(false);
    }
  };

  // Execute Mid-Shift Cash Movement (Slice 4B.3)
  const handleExecuteCashMovement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeShift) {
      setCashMovementError('Active cashier shift required.');
      return;
    }
    const amt = Number(cashMovementAmount);
    if (!amt || amt <= 0) {
      setCashMovementError('Please enter a valid positive amount.');
      return;
    }
    if (!cashMovementReason.trim()) {
      setCashMovementError('Reason/description is required.');
      return;
    }
    if (amt > activeShift.expected_closing_cash) {
      setCashMovementError(
        `Insufficient drawer cash. Available: ${activeShift.expected_closing_cash.toLocaleString()} EGP.`
      );
      return;
    }

    setCashMovementLoading(true);
    setCashMovementError(null);

    try {
      const res = await fetch('/api/pos/shifts/cash-movement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shiftId: activeShift.id,
          movementType: cashMovementType,
          amount: amt,
          reason: cashMovementReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCashMovementError(data.message || data.error || 'Cash movement failed.');
        return;
      }

      // Authoritative update from server
      setCashMovementResult(data.entry);
      if (data.shift) {
        setActiveShift(data.shift);
      }
      setCashMovementAmount('');
      setCashMovementReason('');
    } catch (err: any) {
      setCashMovementError(err.message || 'Network error executing cash movement.');
    } finally {
      setCashMovementLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-[#0D0E12] text-slate-100 -m-6 lg:-m-10 p-6 overflow-hidden">
      {/* Top Shift Status & Quick Action Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Baher POS Console
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  v4B.1 Core
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Cairo Main Boutique &bull; Terminal: <span className="text-white font-mono">POS-01</span>
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 mx-2" />

          {activeShift ? (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold uppercase tracking-wider">Shift Active</span>
              </div>
              <div className="text-slate-400">
                Cashier: <span className="text-slate-200 font-medium">{activeShift.cashier_name}</span>
              </div>
              <div className="text-slate-400">
                Expected Cash: <span className="text-amber-400 font-mono font-bold">{activeShift.expected_closing_cash.toLocaleString()} EGP</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>No Active Shift &bull; Till Locked</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {activeShift ? (
            <>
              <button
                type="button"
                data-testid="scale-status-btn"
                onClick={() => {
                  if (cart.length > 0) {
                    openWeightModalForCartItem(0);
                  } else {
                    setActiveWeightCartIndex(null);
                    setWeightGrossInput(14.25);
                    setWeightStoneInput(0);
                    setWeightSource('SCALE');
                    setWeightError(null);
                    setWeightSuccessRecord(null);
                    setIsWeightModalOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold transition"
                title={isRtl ? 'الميزان الإلكتروني والوزن اليدوي' : 'Digital Scale & Weight Audit'}
              >
                <Scale className="w-3.5 h-3.5 text-sky-400" />
                <span>{isRtl ? 'الميزان' : 'Scale'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
              <button
                onClick={() => setIsReturnModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Process Return
              </button>
              <button
                data-testid="cash-movement-btn"
                onClick={() => {
                  setIsCashMovementModalOpen(true);
                  setCashMovementResult(null);
                  setCashMovementError(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                Cash Movement
              </button>
              <button
                onClick={() => setIsCloseShiftModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
              >
                Close Shift (Z-Report)
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenShiftModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/10 transition"
            >
              <Plus className="w-4 h-4" />
              Open Cashier Shift
            </button>
          )}
        </div>
      </div>

      {/* Main POS Interface Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 pt-4 min-h-0">
        {/* Left Side: Product / Barcode Scanner & Search (7 Cols) */}
        <div className="col-span-7 flex flex-col min-h-0 gap-4">
          {/* Scanner Input Box */}
          <form onSubmit={handleBarcodeLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
              <input
                type="text"
                placeholder="Scan EAN-13 Barcode, Serial (SN-BHR-...), or Product SKU..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={!activeShift}
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono transition disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={!activeShift || lookupLoading}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 transition disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              Lookup
            </button>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              disabled={!activeShift || lookupLoading}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 font-semibold rounded-xl text-sm flex items-center gap-2 transition disabled:opacity-50"
              title="Scan barcode with camera"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Camera</span>
            </button>
          </form>

          {/* Mobile Camera Barcode Scanner Modal */}
          <MobileBarcodeScanner
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onScan={(scannedCode) => {
              setIsCameraOpen(false);
              setSearchInput(scannedCode);
              handleBarcodeLookup(undefined, scannedCode);
            }}
            title="Scan Product Barcode"
          />

          {lookupError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {/* Quick Presets / Catalog Helper */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Quick Catalog Presets &bull; Click to Add to Cart</span>
              <span className="text-slate-500 text-[11px] font-normal">Canonical Baher Products</span>
            </h2>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
              {/* Preset 1: 925 Silver Ring */}
              <button
                onClick={() => {
                  setSearchInput('p1');
                  handleBarcodeLookup(undefined, 'p1');
                }}
                disabled={!activeShift}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">
                      Classic 925 Silver Ring
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      925
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">خاتم فضة كلاسيكي عيار 925</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/40">
                  <span className="text-slate-400 font-mono">8.4g &bull; Serialized</span>
                  <span className="text-amber-400 font-bold font-mono">~501 EGP</span>
                </div>
              </button>

              {/* Preset 2: Drop Earrings */}
              <button
                onClick={() => {
                  setSearchInput('p2');
                  handleBarcodeLookup(undefined, 'p2');
                }}
                disabled={!activeShift}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">
                      Elegance Drop Earrings
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      925
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">أقراط قطرة الأناقة الملكية</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/40">
                  <span className="text-slate-400 font-mono">5.2g &bull; Serialized</span>
                  <span className="text-amber-400 font-bold font-mono">~324 EGP</span>
                </div>
              </button>

              {/* Preset 3: Non-Silver Retail Care Cloth */}
              <button
                onClick={() => {
                  setSearchInput('ret-1');
                  handleBarcodeLookup(undefined, 'ret-1');
                }}
                disabled={!activeShift}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition">
                      Microfiber Polishing Cloth
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      RETAIL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">قماشة تلميع الفضة ميكروفايبر</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/40">
                  <span className="text-slate-400 font-mono">Care Product &bull; Bulk</span>
                  <span className="text-indigo-400 font-bold font-mono">45.00 EGP</span>
                </div>
              </button>

              {/* Preset 4: Velvet Packaging Box */}
              <button
                onClick={() => {
                  setSearchInput('BS-WAT-RET-0001');
                  handleBarcodeLookup(undefined, 'BS-WAT-RET-0001');
                }}
                disabled={!activeShift}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition">
                      Luxury Chrono Watch
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      RETAIL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">ساعة يد كرونوغراف فاخرة</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/40">
                  <span className="text-slate-400 font-mono">Watches &bull; Serialized</span>
                  <span className="text-indigo-400 font-bold font-mono">1,850.00 EGP</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Active Cart & Settlement Checkout (5 Cols) */}
        <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-base">Active Cart</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-slate-400 hover:text-rose-400 transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Customer Attachment Bar */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
            {attachedCustomer ? (
              <div className="flex items-center justify-between w-full p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-amber-300">
                  <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold truncate">{attachedCustomer.name}</p>
                    <p className="text-[10px] text-amber-400/80 font-mono">{attachedCustomer.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAttachedCustomer(null)}
                  className="text-slate-400 hover:text-rose-400 p-1 transition shrink-0 ml-2"
                  title="Detach customer (switch to Anonymous Walk-In)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl text-xs flex items-center justify-between text-slate-400 transition"
              >
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer: <strong className="text-slate-300 font-normal">Walk-In (Anonymous)</strong></span>
                </span>
                <span className="text-[11px] text-amber-400 font-medium">Attach &rarr;</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
                <ShoppingCart className="w-12 h-12 mb-3 stroke-1 text-slate-600" />
                <p className="text-sm font-medium">Cart is currently empty</p>
                <p className="text-xs mt-1">Scan an EAN-13 barcode or select a preset to start checkout</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={`${item.productId}_${idx}`}
                  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {item.profileType === 'SILVER_JEWELRY' ? (
                          <button
                            type="button"
                            onClick={() => openWeightModalForCartItem(idx)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono transition"
                            title={isRtl ? 'تحقق من الميزان أو تعديل يدوي' : 'Verify or override weight with scale'}
                          >
                            <Scale className="w-2.5 h-2.5 text-amber-400" />
                            <span>Silver {item.purity} &bull; {item.weightGrams}g</span>
                            {item.weightAuditRecord && (
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded ml-1">
                                {item.weightAuditRecord.source === 'MANUAL' ? 'MANUAL' : 'SCALE'}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                            Retail Merchandise
                          </span>
                        )}
                        {item.serialNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            S/N: {item.serialNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    {item.profileType === 'NON_SILVER_RETAIL' ? (
                      <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[11px]">Qty:</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(idx, item.quantity - 1)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-white min-w-[1rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(idx, item.quantity + 1)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">Qty: 1 (Serialized)</span>
                    )}
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-400">
                        {item.totalPrice.toLocaleString()} EGP
                      </span>
                      {item.quantity > 1 && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          ({item.unitPrice.toLocaleString()} EGP / unit)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Checkout Action */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t.subtotal}</span>
                <span className="font-mono text-slate-200">{subtotal.toLocaleString()} EGP</span>
              </div>
              {totalSilverWeight > 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>{t.total_silver_weight}</span>
                  <span className="font-mono">{totalSilverWeight.toFixed(2)} g</span>
                </div>
              )}
              {globalDiscount > 0 ? (
                <div className="flex flex-col gap-1 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <Tag className="w-3.5 h-3.5" />
                      {t.commercial_discount}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">-{globalDiscount.toLocaleString()} EGP</span>
                      <button
                        type="button"
                        data-testid="remove-discount-btn"
                        onClick={handleRemoveDiscount}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title={t.remove_discount_btn}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {managerOverrideDetails && (
                    <div
                      data-testid="cart-manager-override-badge"
                      className="text-[10px] text-amber-300 flex items-center gap-1 font-mono pt-0.5"
                    >
                      <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{t.manager_approved_badge}: {managerOverrideDetails.name} ({managerOverrideDetails.role})</span>
                    </div>
                  )}
                </div>
              ) : (
                cart.length > 0 && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      data-testid="open-discount-modal-btn"
                      onClick={() => {
                        setDiscountError(null);
                        setDiscountSuccessMessage(null);
                        setIsDiscountModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-amber-400 font-medium transition"
                    >
                      <Percent className="w-3 h-3" />
                      <span>{t.apply_discount_btn}</span>
                    </button>
                  </div>
                )
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>{t.net_payable}</span>
                <span className="font-mono text-amber-400 text-base">{finalTotal.toLocaleString()} EGP</span>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0 || !activeShift}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {t.proceed_to_payment} ({finalTotal.toLocaleString()} EGP)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Payment & Settlement */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                Select Payment Method
              </h2>
              <span className="text-xs font-mono text-amber-400 font-bold">
                Total: {finalTotal.toLocaleString()} EGP
              </span>
            </div>

            {/* Tender Options */}
            <div className="grid grid-cols-4 gap-2">
              {(['CASH', 'CARD', 'INSTAPAY', 'SPLIT'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1.5 ${
                    paymentMethod === method
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {method === 'CASH' && <DollarSign className="w-4 h-4" />}
                  {method === 'CARD' && <CreditCard className="w-4 h-4" />}
                  {method === 'INSTAPAY' && <Send className="w-4 h-4" />}
                  {method === 'SPLIT' && <Scale className="w-4 h-4" />}
                  <span className="text-[10px]">{method}</span>
                </button>
              ))}
            </div>

            {/* Method Details */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-400">Cash Tendered (EGP)</label>
                <input
                  type="number"
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  placeholder={String(finalTotal)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-base"
                />
                {cashTendered > finalTotal && (
                  <div className="text-xs text-emerald-400 flex justify-between font-mono">
                    <span>Change Due to Customer:</span>
                    <span className="font-bold">{(cashTendered - finalTotal).toLocaleString()} EGP</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'SPLIT' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cash Amount:</span>
                  <input
                    type="number"
                    value={splitCash || ''}
                    onChange={(e) => setSplitCash(Number(e.target.value))}
                    className="w-32 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Card Amount:</span>
                  <input
                    type="number"
                    value={splitCard || ''}
                    onChange={(e) => setSplitCard(Number(e.target.value))}
                    className="w-32 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">InstaPay Amount:</span>
                  <input
                    type="number"
                    value={splitInstapay || ''}
                    onChange={(e) => setSplitInstapay(Number(e.target.value))}
                    className="w-32 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono"
                  />
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-mono">
                  <span>Sum: {(splitCash + splitCard + splitInstapay).toLocaleString()} EGP</span>
                  <span className={splitCash + splitCard + splitInstapay === finalTotal ? 'text-emerald-400' : 'text-rose-400'}>
                    {splitCash + splitCard + splitInstapay === finalTotal ? 'Balanced' : 'Mismatch'}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCheckout}
                disabled={checkoutSubmitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                {checkoutSubmitting ? 'Finalizing...' : 'Complete & Print Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Receipt Preview & ETA QR Code */}
      {completedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs">
            {/* Post-Sale Operational Confirmation Result */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-2 font-sans">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Sale Completed Successfully</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 font-mono">
                <div>
                  <span className="text-slate-500">Tx ID:</span>{' '}
                  <span className="font-semibold text-slate-900">{completedTransaction.id.slice(0, 14)}...</span>
                </div>
                <div>
                  <span className="text-slate-500">Receipt:</span>{' '}
                  <span className="font-semibold text-slate-900">{completedTransaction.receipt_number}</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-emerald-200 text-[10px] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Inventory: Stock ledger SALE event recorded with cryptographic HMAC seal</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                  <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Cash/Till: Shift expected cash updated (+{completedTransaction.total_amount.toLocaleString()} EGP)</span>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-bold tracking-widest uppercase">BAHER SILVER</h2>
              <p className="text-[10px] text-slate-500">Cairo Main Boutique &bull; Egyptian Tax ID: 300-482-918</p>
              <p className="text-[11px] font-bold mt-1 text-slate-700">TAX RECEIPT / فاتورة ضريبية</p>
            </div>

            {/* Receipt Meta */}
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold text-slate-900">{completedTransaction.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date / Time:</span>
                <span>{new Date(completedTransaction.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{completedTransaction.cashier_name}</span>
              </div>
              {completedTransaction.customer_name ? (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>
                    {completedTransaction.customer_name}
                    {completedTransaction.customer_phone ? ` (${completedTransaction.customer_phone})` : ''}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-500">
                  <span>Customer:</span>
                  <span className="italic">Walk-In Customer (Anonymous)</span>
                </div>
              )}
              {completedTransaction.customer_id && (
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Customer ID:</span>
                  <span>{completedTransaction.customer_id}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
              {completedTransaction.items.map((item, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{item.product_name}</p>
                    <p className="text-[10px] text-slate-500">
                      {item.profile_type === 'SILVER_JEWELRY'
                        ? `925 Silver &bull; ${item.weight_grams}g`
                        : 'Retail Merchandise'}
                      {item.serial_number && ` &bull; S/N: ${item.serial_number}`}
                    </p>
                  </div>
                  <span className="font-bold">{item.total_price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{completedTransaction.subtotal_amount.toFixed(2)} EGP</span>
              </div>
              {completedTransaction.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{completedTransaction.discount_amount.toFixed(2)} EGP</span>
                </div>
              )}
              {completedTransaction.manager_override && (
                <div
                  data-testid="receipt-manager-override-badge"
                  className="p-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900 space-y-0.5"
                >
                  <div className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Manager Override: {completedTransaction.manager_override.manager_name} ({completedTransaction.manager_override.manager_role})</span>
                  </div>
                  <p className="text-slate-600 italic">Reason: {completedTransaction.manager_override.reason}</p>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-300">
                <span>TOTAL PAID:</span>
                <span>{completedTransaction.total_amount.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Tender ({completedTransaction.payment_method}):</span>
                <span>{completedTransaction.total_amount.toFixed(2)} EGP</span>
              </div>
            </div>

            {/* ZATCA / ETA QR Code Representation */}
            <div className="flex flex-col items-center pt-2 pb-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <Barcode className="w-16 h-8 mx-auto text-slate-700" />
                <p className="text-[9px] text-slate-400 mt-1 font-mono tracking-tighter">
                  {completedTransaction.receipt_number}
                </p>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 text-center">
                ZATCA / ETA Electronic Receipt &bull; Authentic Baher Silver
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-sans font-bold flex items-center justify-center gap-1.5 text-xs hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => setCompletedTransaction(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-sans font-bold text-xs transition flex items-center gap-1"
              >
                <span>New Sale / Next Customer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Open Shift */}
      {isOpenShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" /> Open Cashier Shift
            </h3>
            <p className="text-slate-400">Count physical cash in the till drawer before beginning sales.</p>
            <div>
              <label className="text-slate-400 block mb-1">Opening Cash Float (EGP)</label>
              <input
                type="number"
                value={openingFloatInput}
                onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setIsOpenShiftModal(false)} className="px-3 py-1.5 text-slate-400">Cancel</button>
              <button onClick={handleOpenShift} className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg">
                Confirm & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Close Shift (Reconciliation & Z-Report) */}
      {isCloseShiftModal && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-400" /> Close Cashier Shift & Reconcile Till
            </h3>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Opening Float:</span>
                <span>{activeShift.opening_float.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cash Sales:</span>
                <span>+{activeShift.total_cash_sales.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cash Refunds:</span>
                <span>-{activeShift.total_refunds_cash.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between text-amber-400 font-bold pt-1 border-t border-slate-800">
                <span>Expected Drawer Cash:</span>
                <span>{activeShift.expected_closing_cash.toLocaleString()} EGP</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Declared Physical Cash Count (EGP)</label>
              <input
                type="number"
                value={declaredCashInput || ''}
                onChange={(e) => setDeclaredCashInput(Number(e.target.value))}
                placeholder="Enter exact count..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm"
              />
              {declaredCashInput > 0 && (
                <p className={`mt-1 font-mono text-[11px] ${declaredCashInput === activeShift.expected_closing_cash ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Discrepancy: {(declaredCashInput - activeShift.expected_closing_cash).toFixed(2)} EGP
                </p>
              )}
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Closing Notes / Discrepancy Reason</label>
              <textarea
                value={closingNotesInput}
                onChange={(e) => setClosingNotesInput(e.target.value)}
                placeholder="Required if discrepancy exists..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsCloseShiftModal(false)} className="px-3 py-1.5 text-slate-400">Cancel</button>
              <button onClick={handleCloseShift} className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg">
                Close Shift & Print Z-Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Z-Report Display */}
      {zReportData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-3 font-mono text-xs">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h2 className="text-base font-bold">DAILY Z-REPORT</h2>
              <p className="text-[10px] text-slate-500">Report #{zReportData.report_number}</p>
              <p className="text-[10px] text-slate-500">{zReportData.branch_name}</p>
            </div>

            <div className="space-y-1 text-slate-600 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between"><span>Date:</span><span>{zReportData.date}</span></div>
              <div className="flex justify-between"><span>Cashier:</span><span>{zReportData.cashier_name}</span></div>
              <div className="flex justify-between"><span>Total Sales:</span><span className="font-bold text-slate-900">{zReportData.financials.total_sales.toFixed(2)} EGP</span></div>
              <div className="flex justify-between text-[11px]"><span>Cash Sales:</span><span>{zReportData.financials.cash_sales.toFixed(2)} EGP</span></div>
              <div className="flex justify-between text-[11px]"><span>Card Sales:</span><span>{zReportData.financials.card_sales.toFixed(2)} EGP</span></div>
              <div className="flex justify-between text-[11px]"><span>InstaPay Sales:</span><span>{zReportData.financials.instapay_sales.toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span>Cash Refunds:</span><span>-{zReportData.financials.cash_refunds.toFixed(2)} EGP</span></div>
            </div>

            <div className="space-y-1 text-slate-600 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Silver Grams Sold:</span>
                <span>{zReportData.metrics.total_silver_grams_sold.toFixed(2)} g</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>925 Sterling:</span>
                <span>{zReportData.metrics.silver_grams_by_purity['925'].toFixed(2)} g</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Silver Pieces Sold:</span>
                <span>{zReportData.metrics.silver_pieces_sold}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Retail Merch Sold:</span>
                <span>{zReportData.metrics.retail_pieces_sold}</span>
              </div>
            </div>

            <div className="space-y-1 text-slate-800 font-bold pt-1">
              <div className="flex justify-between"><span>Expected Cash:</span><span>{zReportData.financials.expected_closing_cash.toFixed(2)} EGP</span></div>
              <div className="flex justify-between"><span>Declared Cash:</span><span>{zReportData.financials.declared_closing_cash.toFixed(2)} EGP</span></div>
              <div className="flex justify-between text-amber-700"><span>Variance:</span><span>{zReportData.financials.cash_discrepancy.toFixed(2)} EGP</span></div>
            </div>

            <button
              onClick={() => setZReportData(null)}
              className="mt-2 w-full py-2 bg-slate-900 text-white rounded-lg font-sans font-bold"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: Process Return */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" /> Process Customer Return
            </h3>
            <div>
              <label className="text-slate-400 block mb-1">Receipt Number or Sale ID</label>
              <input
                type="text"
                value={returnReceiptInput}
                onChange={(e) => setReturnReceiptInput(e.target.value)}
                placeholder="REC-YYYYMMDD-XXXX or sale_..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Return Reason</label>
              <input
                type="text"
                value={returnReasonInput}
                onChange={(e) => setReturnReasonInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Refund Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethodInput('CASH')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    refundMethodInput === 'CASH'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" /> Cash Refund
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMethodInput('CARD')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    refundMethodInput === 'CARD'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Card Reversal
                </button>
              </div>
            </div>

            {returnResult && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                <p className="font-bold">Return Processed Successfully!</p>
                <p className="font-mono mt-1">Return Receipt: {returnResult.returnTransaction.receipt_number}</p>
                <p className="font-mono">Refund Amount: {Math.abs(returnResult.returnTransaction.total_amount)} EGP</p>
                <p className="font-mono text-[11px] text-slate-400">Method: {refundMethodInput}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setIsReturnModalOpen(false); setReturnResult(null); }} className="px-3 py-1.5 text-slate-400">
                Close
              </button>
              <button
                onClick={handleExecuteReturn}
                disabled={returnLoading || !returnReceiptInput.trim()}
                className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg disabled:opacity-50"
              >
                {returnLoading ? 'Processing...' : 'Execute Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6.5: Till Cash Movement (Slice 4B.3) */}
      {isCashMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-400" /> Till Cash Movement
              </h3>
              <button
                onClick={() => {
                  setIsCashMovementModalOpen(false);
                  setCashMovementResult(null);
                  setCashMovementError(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Drawer Status */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Active Terminal Drawer</span>
                <span className="text-slate-200 font-medium">{activeShift?.terminal_id || 'POS-01'} &bull; {activeShift?.cashier_name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Available Cash</span>
                <span className="text-amber-400 font-mono font-bold text-sm">
                  {(activeShift?.expected_closing_cash || 0).toLocaleString()} EGP
                </span>
              </div>
            </div>

            {/* Movement Type Selector */}
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Movement Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setCashMovementType('CASH_OUT'); setCashMovementError(null); }}
                  className={`py-2 px-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition ${
                    cashMovementType === 'CASH_OUT'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Cash Out</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCashMovementType('EXPENSE'); setCashMovementError(null); }}
                  className={`py-2 px-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition ${
                    cashMovementType === 'EXPENSE'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCashMovementType('SAFE_DROP'); setCashMovementError(null); }}
                  className={`py-2 px-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition ${
                    cashMovementType === 'SAFE_DROP'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Safe Drop</span>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Amount (EGP) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cashMovementAmount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setCashMovementAmount(val);
                    setCashMovementError(null);
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono font-bold">EGP</span>
              </div>
              {Number(cashMovementAmount) > (activeShift?.expected_closing_cash || 0) && (
                <p className="text-rose-400 text-[11px] mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Amount exceeds available drawer cash ({(activeShift?.expected_closing_cash || 0).toLocaleString()} EGP).
                </p>
              )}
            </div>

            {/* Reason / Description Input */}
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Reason / Description <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={cashMovementReason}
                onChange={(e) => {
                  setCashMovementReason(e.target.value);
                  setCashMovementError(null);
                }}
                placeholder={
                  cashMovementType === 'SAFE_DROP'
                    ? 'e.g., Afternoon excess cash drop to vault'
                    : cashMovementType === 'EXPENSE'
                    ? 'e.g., Courier fee, Cleaning supplies, Hospitality'
                    : 'e.g., Cashier payout, Change exchange'
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Error Banner */}
            {cashMovementError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{cashMovementError}</span>
              </div>
            )}

            {/* Server-Confirmed Result Banner */}
            {cashMovementResult && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Movement Confirmed by Server</span>
                </div>
                <div className="space-y-0.5 font-mono text-[11px] text-slate-300">
                  <p>Type: <span className="text-amber-400 font-bold">{cashMovementResult.movement_type}</span></p>
                  <p>Amount: <span className="text-white font-bold">{cashMovementResult.amount} EGP</span></p>
                  <p>Journal Entry: <span className="text-slate-400">{cashMovementResult.id}</span></p>
                  <p>Reason: <span className="text-slate-400">{cashMovementResult.notes}</span></p>
                  <p className="text-emerald-400 font-semibold pt-1">
                    Updated Drawer Balance: {activeShift?.expected_closing_cash.toLocaleString()} EGP
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                data-testid="close-cash-movement-modal-btn"
                type="button"
                onClick={() => {
                  setIsCashMovementModalOpen(false);
                  setCashMovementResult(null);
                  setCashMovementError(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-lg text-xs"
              >
                Close
              </button>
              <button
                data-testid="confirm-cash-movement-btn"
                type="button"
                onClick={handleExecuteCashMovement}
                disabled={
                  cashMovementLoading ||
                  !cashMovementAmount ||
                  Number(cashMovementAmount) <= 0 ||
                  !cashMovementReason.trim() ||
                  Number(cashMovementAmount) > (activeShift?.expected_closing_cash || 0)
                }
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
              >
                {cashMovementLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Movement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Customer Master Search & Attachment */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-amber-400" /> Attach Customer to Cart
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search existing customer by name or phone..."
                value={customerSearchQuery}
                onChange={(e) => handleSearchCustomers(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {customerSearching ? (
                <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Searching Customer Master...</span>
                </div>
              ) : customerSearchResults.length === 0 ? (
                <p className="text-center text-slate-500 py-6">
                  {customerSearchQuery.trim() ? 'No active customer found.' : 'Type to search Customer Master...'}
                </p>
              ) : (
                customerSearchResults.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setAttachedCustomer({ id: cust.id, name: cust.name, phone: cust.phone });
                      setIsCustomerModalOpen(false);
                      setCustomerSearchQuery('');
                      setCustomerSearchResults([]);
                    }}
                    className="p-2.5 bg-slate-950/60 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 rounded-xl cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{cust.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{cust.phone} &bull; {cust.normalized_phone}</p>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">Select &rarr;</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setAttachedCustomer(null);
                  setIsCustomerModalOpen(false);
                }}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Continue as Walk-In (Anonymous)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: Multi-Match Product Selection */}
      {isMultiMatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-400" /> Multiple Products Found
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {multiMatchResults.length} catalog items match your search. Select one to proceed:
                </p>
              </div>
              <button
                onClick={() => {
                  setIsMultiMatchModalOpen(false);
                  setMultiMatchResults([]);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {multiMatchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.profile_type === 'SILVER_JEWELRY' && item.available_pieces && item.available_pieces.length > 1) {
                      setPendingPieceProduct(item);
                      setAvailablePiecesForProduct(item.available_pieces);
                      setIsMultiMatchModalOpen(false);
                      setIsPieceModalOpen(true);
                    } else {
                      addProductToCart(item, item.available_pieces?.[0]);
                      setIsMultiMatchModalOpen(false);
                      setMultiMatchResults([]);
                    }
                  }}
                  className="p-3 bg-slate-950/60 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 rounded-xl cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition">
                        {typeof item.name === 'object' ? item.name?.en || item.name?.ar : item.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          item.profile_type === 'NON_SILVER_RETAIL'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.profile_type === 'NON_SILVER_RETAIL' ? 'Retail Non-Silver' : `${item.purity || '925'} Silver`}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                      <span>SKU: {item.sku}</span>
                      {item.barcode && <span>EAN: {item.barcode}</span>}
                      {item.weight_grams && <span>{item.weight_grams}g</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {(item.price || 0).toLocaleString()} EGP
                    </span>
                    <span className="block text-[10px] text-slate-400 group-hover:text-amber-400 transition font-mono">
                      Select &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsMultiMatchModalOpen(false);
                  setMultiMatchResults([]);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: Serialized Piece Selection */}
      {isPieceModalOpen && pendingPieceProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" /> Select Serialized Piece
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Product: {typeof pendingPieceProduct.name === 'object' ? pendingPieceProduct.name?.en || pendingPieceProduct.name?.ar : pendingPieceProduct.name} ({pendingPieceProduct.sku})
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPieceModalOpen(false);
                  setPendingPieceProduct(null);
                  setAvailablePiecesForProduct([]);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400 text-[11px]">
              Multiple physical serialized pieces are available in stock. Click a piece to add its exact weight and serial to the cart:
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {availablePiecesForProduct.map((piece) => {
                const inCart = cart.some((c) => c.serialNumber === piece.serial_number);
                return (
                  <div
                    key={piece.id || piece.serial_number}
                    onClick={() => {
                      if (inCart) return;
                      addProductToCart(pendingPieceProduct, piece);
                      setIsPieceModalOpen(false);
                      setPendingPieceProduct(null);
                      setAvailablePiecesForProduct([]);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      inCart
                        ? 'bg-slate-950/40 border-slate-800/50 opacity-50 cursor-not-allowed'
                        : 'bg-slate-950/60 hover:bg-amber-500/10 border-slate-800 hover:border-amber-500/40 cursor-pointer group'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-200 group-hover:text-amber-300 transition">
                          SN: {piece.serial_number}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">
                          {piece.lifecycle_status || 'IN_SHOWCASE'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                        <span>Barcode: {piece.barcode}</span>
                        {piece.location && <span>Location: {piece.location}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {(piece.current_weight_grams || piece.initial_weight_grams || pendingPieceProduct.weight_grams || 0).toFixed(2)} g
                      </span>
                      <span className="block text-[10px] text-slate-400 group-hover:text-amber-400 transition font-mono">
                        {inCart ? 'Already In Cart' : 'Select Piece \u2192'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsPieceModalOpen(false);
                  setPendingPieceProduct(null);
                  setAvailablePiecesForProduct([]);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: Discount & Manager Override Modal */}
      {isDiscountModalOpen && (
        <div
          data-testid="discount-modal"
          dir={isRtl ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-400" />
                {t.discount_modal_title}
              </h3>
              <button
                type="button"
                data-testid="close-discount-modal-btn"
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-slate-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtotal Context */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 font-semibold">{t.subtotal}:</span>
              <span className="font-mono text-white font-bold text-sm">{subtotal.toLocaleString()} EGP</span>
            </div>

            {/* Discount Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('PERCENT')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  discountType === 'PERCENT'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>{t.discount_type_percent}</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('FIXED')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  discountType === 'FIXED'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>{t.discount_type_fixed}</span>
              </button>
            </div>

            {/* Discount Value Input */}
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                {t.discount_value_label} <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step={discountType === 'PERCENT' ? '1' : '5'}
                  max={discountType === 'PERCENT' ? '100' : String(subtotal)}
                  value={discountValueInput}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setDiscountValueInput(val);
                    setDiscountError(null);
                  }}
                  placeholder={discountType === 'PERCENT' ? '5' : '100.00'}
                  data-testid="discount-value-input"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono font-bold">
                  {discountType === 'PERCENT' ? '%' : 'EGP'}
                </span>
              </div>
              {computedDiscountAmount > 0 && (
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                  <span>Effective Discount: <strong className="text-amber-300">{computedDiscountAmount} EGP ({effectivePercent.toFixed(1)}%)</strong></span>
                  <span>New Total: <strong className="text-emerald-400">{Math.max(0, subtotal - computedDiscountAmount)} EGP</strong></span>
                </div>
              )}
            </div>

            {/* Cashier Authority Notice */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>{t.cashier_limit_info}</span>
            </div>

            {/* Warning if Over Limit */}
            {isOverCashierLimit && (
              <div
                data-testid="manager-override-required-banner"
                className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs space-y-2"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t.manager_override_warning}</span>
                </div>

                <div className="pt-2 border-t border-amber-500/20 space-y-2">
                  <p className="font-semibold text-[11px] text-amber-200 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    {t.manager_credentials_title}
                  </p>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">{t.manager_email_label}</label>
                    <input
                      type="email"
                      value={managerEmailInput}
                      onChange={(e) => setManagerEmailInput(e.target.value)}
                      placeholder="storemanager@bahersilver.com"
                      data-testid="manager-email-input"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">{t.manager_password_label}</label>
                    <input
                      type="password"
                      value={managerPasswordInput}
                      onChange={(e) => setManagerPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      data-testid="manager-password-input"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Discount Reason Input */}
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                {t.discount_reason_label} {isOverCashierLimit && <span className="text-rose-400">*</span>}
              </label>
              <input
                type="text"
                value={discountReasonInput}
                onChange={(e) => {
                  setDiscountReasonInput(e.target.value);
                  setDiscountError(null);
                }}
                placeholder={t.discount_reason_placeholder}
                data-testid="discount-reason-input"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Error Banner */}
            {discountError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{discountError}</span>
              </div>
            )}

            {/* Success Message Banner */}
            {discountSuccessMessage && (
              <div
                data-testid="discount-authorized-banner"
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{t.discount_approved_success} {discountSuccessMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                data-testid="close-discount-modal-btn"
                onClick={() => setIsDiscountModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-lg text-xs"
              >
                {t.cancel_btn}
              </button>

              {isOverCashierLimit ? (
                <button
                  type="button"
                  data-testid="authorize-manager-override-btn"
                  onClick={handleAuthorizeManagerOverride}
                  disabled={
                    discountLoading ||
                    !computedDiscountAmount ||
                    !managerEmailInput.trim() ||
                    !managerPasswordInput ||
                    !discountReasonInput.trim()
                  }
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  {discountLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isRtl ? 'جاري التحقق...' : 'Authorizing...'}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{t.authorize_override_btn}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="apply-cashier-discount-btn"
                  onClick={handleApplyCashierDiscount}
                  disabled={!computedDiscountAmount || computedDiscountAmount <= 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.apply_cashier_discount_btn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 11: Scale Verification & Manual Weight Override (Silver OS) */}
      {isWeightModalOpen && (
        <div
          data-testid="weight-modal"
          dir={isRtl ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  {isRtl ? 'التحقق من وزن الميزان وتجاوز القراءة' : 'Scale Verification & Weight Override'}
                </h3>
                {activeWeightCartIndex !== null && cart[activeWeightCartIndex] && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {cart[activeWeightCartIndex].name} ({cart[activeWeightCartIndex].sku})
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsWeightModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Mode Selector */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setWeightSource('SCALE')}
                className={`py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                  weightSource === 'SCALE'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{isRtl ? 'الميزان' : 'Scale'}</span>
              </button>
              <button
                type="button"
                onClick={() => setWeightSource('BARCODE')}
                className={`py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                  weightSource === 'BARCODE'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{isRtl ? 'الباركود' : 'Barcode'}</span>
              </button>
              <button
                type="button"
                onClick={() => setWeightSource('MANUAL')}
                className={`py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                  weightSource === 'MANUAL'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isRtl ? 'يدوي (Admin)' : 'Manual'}</span>
              </button>
            </div>

            {/* SCALE MODE */}
            {weightSource === 'SCALE' && (
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isRtl ? 'الميزان متصل وثابت' : 'Scale Online & Stable'}</span>
                </div>
                <div className="text-4xl font-mono font-bold text-white tracking-wider">
                  {simulatedScaleWeight.toFixed(2)}{' '}
                  <span className="text-sm text-slate-400 font-sans">g</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {isRtl ? 'القراءة اللحظية من منفذ الميزان الإلكتروني' : 'Authoritative reading from connected digital scale'}
                </p>
              </div>
            )}

            {/* BARCODE MODE */}
            {weightSource === 'BARCODE' && (
              <div className="space-y-3">
                <label className="block text-slate-300 font-medium text-[11px]">
                  {isRtl ? 'الوزن المضمن بالباركود (جرام)' : 'Weight from Scale Barcode (grams)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={weightGrossInput}
                  onChange={(e) => setWeightGrossInput(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono text-base focus:border-amber-500"
                />
              </div>
            )}

            {/* MANUAL MODE */}
            {weightSource === 'MANUAL' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    {isRtl
                      ? 'تنبيه أمني: إدخال الوزن يدويًا محصور بالأدمن فقط ومسجل في سجل المراجعة غير القابل للتعديل.'
                      : 'Security Guard: Manual weight overrides require Admin authority and are logged in the append-only audit trail.'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium text-[11px] mb-1">
                      {isRtl ? 'الوزن القائم (جرام) *' : 'Gross Weight (g) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightGrossInput}
                      onChange={(e) => setWeightGrossInput(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium text-[11px] mb-1">
                      {isRtl ? 'وزن الفصوص (جرام)' : 'Stones (g)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightStoneInput}
                      onChange={(e) => setWeightStoneInput(e.target.value ? Number(e.target.value) : 0)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium text-[11px] mb-1">
                    {isRtl ? 'سبب التعديل اليدوي (إلزامي) *' : 'Override Reason (Mandatory) *'}
                  </label>
                  <select
                    value={manualReasonInput}
                    onChange={(e: any) => setManualReasonInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:border-rose-500 font-medium"
                  >
                    <option value="SCALE_FAILURE">
                      {isRtl ? 'عطل ميزان (SCALE_FAILURE)' : 'Scale Disconnected / Failure (SCALE_FAILURE)'}
                    </option>
                    <option value="TEST">
                      {isRtl ? 'تجربة واختبار نظام (TEST)' : 'Testing / Simulation (TEST)'}
                    </option>
                    <option value="READING_CORRECTION">
                      {isRtl ? 'تصحيح قراءة خاطئة (READING_CORRECTION)' : 'Reading Correction (READING_CORRECTION)'}
                    </option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 block">
                    {isRtl ? 'تصريح المشرف / الأدمن (إن لم يكن المستخدم الحالي أدمن):' : 'Manager / Admin Credentials (if cashier):'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={weightManagerEmail}
                      onChange={(e) => setWeightManagerEmail(e.target.value)}
                      placeholder="admin@bahersilver.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-white text-[11px]"
                    />
                    <input
                      type="password"
                      value={weightManagerPassword}
                      onChange={(e) => setWeightManagerPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error & Success Alerts */}
            {weightError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{weightError}</span>
              </div>
            )}

            {weightSuccessRecord && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>
                  {isRtl ? 'تم التحقق من الوزن وتسجيل التوقيع الرقمي بنجاح' : 'Weight verified & cryptographically signed.'}
                </span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsWeightModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                data-testid="confirm-weight-btn"
                onClick={handleVerifyWeight}
                disabled={weightLoading || (activeWeightCartIndex === null && cart.length === 0)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {weightLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isRtl ? 'جاري التحقق...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تأكيد الوزن واحتساب السعر' : 'Confirm & Recalculate'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
