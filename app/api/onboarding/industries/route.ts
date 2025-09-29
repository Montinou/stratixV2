import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { getAllIndustries, searchIndustries, getIndustriesByCategory } from "@/lib/database/onboarding-queries";
import { handleUnknownError } from "@/lib/api/error-handler";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    let industries;

    if (query) {
      // Search industries by query
      industries = await searchIndustries(query);
    } else if (category) {
      // Get industries by category
      industries = await getIndustriesByCategory(category);
    } else {
      // Get all industries
      industries = await getAllIndustries();
    }

    // Group by category for better frontend handling
    const categorizedIndustries = industries.reduce((acc, industry) => {
      const cat = industry.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(industry);
      return acc;
    }, {} as Record<string, typeof industries>);

    // Get unique categories
    const categories = Object.keys(categorizedIndustries).sort();

    return new Response(JSON.stringify({
      industries,
      categorized: categorizedIndustries,
      categories,
      total: industries.length
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour since industries don't change often
      }
    });

  } catch (error) {
    console.error("Error fetching industries:", error);
    return handleUnknownError(error, 'Fetch Industries');
  }
}