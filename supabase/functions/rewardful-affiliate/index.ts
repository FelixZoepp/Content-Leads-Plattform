import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REWARDFUL-AFFILIATE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const rewardfulSecret = Deno.env.get("REWARDFUL_API_SECRET");
    if (!rewardfulSecret) {
      throw new Error("REWARDFUL_API_SECRET is not set");
    }
    logStep("Rewardful API secret verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { action, firstName, lastName } = body;
    logStep("Action requested", { action });

    const authString = btoa(`${rewardfulSecret}:`);
    const headers = {
      "Authorization": `Basic ${authString}`,
      "Content-Type": "application/json",
    };

    const listAffiliateLinks = async (affiliateId: string): Promise<any[]> => {
      const url = `https://api.getrewardful.com/v1/affiliate_links?affiliate_id=${encodeURIComponent(affiliateId)}`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorText = await res.text();
        logStep("Error fetching affiliate links", { status: res.status, error: errorText });
        return [];
      }

      const json = await res.json();
      const links = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const filtered = links.filter((l: any) => l?.affiliate_id === affiliateId);
      return filtered.length > 0 ? filtered : links;
    };

    const normalizeToken = (input: string) => {
      return input
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    };

    const buildPreferredTokenBase = () => {
      const emailBase = user.email?.split("@")[0] ?? "partner";
      const nameBase = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
      const base = normalizeToken(nameBase) || normalizeToken(emailBase) || "partner";
      // Keep it readable as a Kürzel, but leave room for the suffix
      return base.slice(0, 18);
    };

    const randomSuffix = (len = 6) => {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hex.slice(0, len);
    };

    const isTokenUnique = (token: string | null | undefined): boolean => {
      if (!token) return false;
      // A unique token should have a suffix pattern like "name-a1b2c3" (at least 4 hex chars after dash)
      // OR it should be a UUID-like pattern from Rewardful
      return /^.+-[a-f0-9]{4,}$/i.test(token) || /^[a-f0-9]{8,}$/i.test(token);
    };

    const ensurePrimaryAffiliateLink = async (affiliateId: string) => {
      const links = await listAffiliateLinks(affiliateId);

      // First, try to find a unique link (with suffix pattern)
      const uniqueLink = links.find(l => isTokenUnique(l?.token));
      
      if (uniqueLink) {
        logStep("Found existing unique link", { token: uniqueLink.token });
        return { 
          primaryUrl: uniqueLink.url, 
          primaryToken: uniqueLink.token, 
          links 
        };
      }

      // No unique link exists - try to create one
      const base = buildPreferredTokenBase();
      let createdLink: any | null = null;

      logStep("Attempting to create unique affiliate link", { 
        existingLinksCount: links.length,
        existingTokens: links.map(l => l?.token),
        base 
      });

      // Try to create link with a unique token
      for (let attempt = 0; attempt < 3; attempt++) {
        const tokenCandidate = `${base}-${randomSuffix(6)}`;

        const createRes = await fetch("https://api.getrewardful.com/v1/affiliate_links", {
          method: "POST",
          headers: {
            Authorization: headers.Authorization,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            affiliate_id: affiliateId,
            token: tokenCandidate,
          }).toString(),
        });

        if (createRes.ok) {
          const createdJson = await createRes.json();
          createdLink = createdJson?.data ?? createdJson;
          logStep("Created unique affiliate link", {
            affiliateId,
            url: createdLink?.url,
            token: createdLink?.token,
          });
          break;
        }

        const errorText = await createRes.text();
        
        // Plan limitation - cannot create new links, use existing
        if (createRes.status === 402) {
          logStep("Rewardful plan does not allow creating new links, using existing", { 
            existingToken: links?.[0]?.token 
          });
          break;
        }
        
        if (createRes.status === 422 && errorText.toLowerCase().includes("token is already in use")) {
          logStep("Token already in use, retrying...", { attempt, token: tokenCandidate });
          continue;
        }

        logStep("Failed to create affiliate link", { status: createRes.status, error: errorText });
        break;
      }

      // Return the newly created unique link as PRIMARY, or fall back to existing
      if (createdLink) {
        return { 
          primaryUrl: createdLink.url, 
          primaryToken: createdLink.token, 
          links: [createdLink, ...links] 
        };
      }

      // Use existing link as fallback
      const primaryUrl = links?.[0]?.url ?? null;
      const primaryToken = links?.[0]?.token ?? null;
      logStep("Using existing affiliate link", { primaryToken });
      return { primaryUrl, primaryToken, links };
    };

    if (action === "get-affiliate") {
      // Try to find existing affiliate by email
      const searchResponse = await fetch(
        `https://api.getrewardful.com/v1/affiliates?email=${encodeURIComponent(user.email)}`,
        { headers }
      );
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        logStep("Error searching affiliates", { status: searchResponse.status, error: errorText });
        throw new Error(`Rewardful API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      logStep("Search result", { count: searchData.data?.length });

      if (searchData.data && searchData.data.length > 0) {
        const affiliate = searchData.data[0];

        const { primaryUrl, primaryToken, links } = await ensurePrimaryAffiliateLink(affiliate.id);
        const affiliateWithLink = {
          ...affiliate,
          link: affiliate.link ?? primaryUrl,
          partner_code: primaryToken,
          links,
        };

        logStep("Found existing affiliate", {
          id: affiliate.id,
          hasLink: Boolean(affiliateWithLink.link),
          linksCount: links?.length ?? 0,
        });

        // Get referrals for this affiliate
        const referralsResponse = await fetch(
          `https://api.getrewardful.com/v1/referrals?affiliate_id=${affiliate.id}`,
          { headers }
        );

        let referrals = [];
        if (referralsResponse.ok) {
          const referralsData = await referralsResponse.json();
          referrals = referralsData.data || [];
        }

        // Get commissions for this affiliate
        const commissionsResponse = await fetch(
          `https://api.getrewardful.com/v1/commissions?affiliate_id=${affiliate.id}`,
          { headers }
        );

        let commissions = [];
        if (commissionsResponse.ok) {
          const commissionsData = await commissionsResponse.json();
          commissions = commissionsData.data || [];
        }

        return new Response(
          JSON.stringify({
            affiliate: affiliateWithLink,
            referrals,
            commissions,
            exists: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      return new Response(JSON.stringify({ exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "create-affiliate") {
      // Check if affiliate already exists first
      const searchResponse = await fetch(
        `https://api.getrewardful.com/v1/affiliates?email=${encodeURIComponent(user.email)}`,
        { headers }
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          const existingAffiliate = searchData.data[0];

          const { primaryUrl, primaryToken, links } = await ensurePrimaryAffiliateLink(existingAffiliate.id);
          const affiliateWithLink = {
            ...existingAffiliate,
            link: existingAffiliate.link ?? primaryUrl,
            partner_code: primaryToken,
            links,
          };

          logStep("Affiliate already exists", {
            id: existingAffiliate.id,
            hasLink: Boolean(affiliateWithLink.link),
            linksCount: links?.length ?? 0,
          });

          return new Response(
            JSON.stringify({
              affiliate: affiliateWithLink,
              referrals: [],
              commissions: [],
              exists: true,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
      
      const createResponse = await fetch("https://api.getrewardful.com/v1/affiliates", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: user.email,
          first_name: firstName || user.user_metadata?.name?.split(' ')[0] || "Partner",
          last_name: lastName || user.user_metadata?.name?.split(' ').slice(1).join(' ') || "",
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        logStep("Error creating affiliate", { status: createResponse.status, error: errorText });
        throw new Error(`Failed to create affiliate: ${createResponse.status}`);
      }

      const createdJson = await createResponse.json();
      const affiliate = createdJson?.data ?? createdJson;

      const { primaryUrl, primaryToken, links } = await ensurePrimaryAffiliateLink(affiliate.id);
      const affiliateWithLink = {
        ...affiliate,
        link: affiliate.link ?? primaryUrl,
        partner_code: primaryToken,
        links,
      };

      logStep("Created new affiliate", {
        id: affiliate.id,
        hasLink: Boolean(affiliateWithLink.link),
        linksCount: links?.length ?? 0,
      });

      return new Response(
        JSON.stringify({
          affiliate: affiliateWithLink,
          referrals: [],
          commissions: [],
          exists: true,
          justCreated: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
