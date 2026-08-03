import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name_ar, name_en, category, silver_weight_g } = body;

    let result = {};

    switch (action) {
      case 'generate_description':
        result = {
          short_description_ar: `قطعة فضة عيار 925 أصيلة مصممة بعناية فائقة بتفاصيل تبرز أناقة الفنون المصرية الشرقية.`,
          short_description_en: `Authentic 925 Sterling Silver piece meticulously crafted to showcase royal Eastern elegance.`,
          description_ar: `تمتاز هذه القطعة المصنوعة يدويًا من الفضة الخالصة عيار 925 بالتناغم الفائق بين اللمعان والصلابة. تصميم مستوحى من التراث الفضي الملكي، مع لمسات نهائية مقاومة للأكسدة لضمان بريق يدوم طوال العمر.`,
          description_en: `Crafted from pure 925 Sterling Silver, this piece combines timeless heritage with modern luxury. Finished with anti-tarnish rhodium plating for a lifetime of luster.`
        };
        break;

      case 'improve_description':
        result = {
          improved_description_ar: `إضافة لمسات شاعرية وترويجية ممتازة تحفز قرار الشراء الفوري وتبرز نقاء الفضة عيار 925 ورقي الصنعة اليدوية.`,
          improved_description_en: `Enhanced narrative emphasizing 925 purity certification, handcrafted heritage value, and luxury presentation packaging.`
        };
        break;

      case 'improve_seo':
        result = {
          meta_title: `${name_ar || name_en} | فضة عيار 925 | باهر سيلفر`,
          meta_description: `تسوق ${name_ar || name_en} الأصلي من الفضة الخالصة عيار 925. ضمان مدى الحياة وشحن سريع لجميع المحافظات.`,
          keywords: ['فضة 925', 'مجوهرات فضة', name_en, name_ar, 'بااهر سيلفر', 'هدايا فضية'].filter(Boolean)
        };
        break;

      case 'suggest_price':
        const weight = Number(silver_weight_g) || 8.5;
        const estimatedSilverCost = weight * 45;
        const labor = 35;
        const suggestedSellingPrice = Math.ceil((estimatedSilverCost + labor + 20) * 1.45);
        result = {
          suggested_price: suggestedSellingPrice,
          estimated_cost: Math.round(estimatedSilverCost + labor + 20),
          reasoning: `تم حساب السعر بناءً على سعر جرام الفضة الحالي (45 ج.م)، مصنعية العمل اليدوي (35 ج.م)، وهامش ربح متوقع 45%.`
        };
        break;

      case 'suggest_keywords':
        result = {
          suggested_keywords: ['فضة ملكية', 'خاتم فضة 925', 'هدايا فضة مصنعة يدويًا', 'Silver Jewelry Cairo', 'Sterling Silver 925']
        };
        break;

      case 'suggest_category':
        result = {
          suggested_category: category || 'Rings',
          confidence: 0.96
        };
        break;

      case 'suggest_collection':
        result = {
          suggested_collection: 'Heritage Collection (مجموعة التراث)',
          confidence: 0.92
        };
        break;

      default:
        return NextResponse.json({ success: false, error: 'Unknown AI action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown AI error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
