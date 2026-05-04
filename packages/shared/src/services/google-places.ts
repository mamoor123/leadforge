// Google Places API integration — find businesses by niche + city

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  latitude: number;
  longitude: number;
  types: string[];
  permanentlyClosed: boolean;
}

interface SearchParams {
  niche: string;
  city: string;
  state?: string;
  country?: string;
  radius?: number; // meters, default 50000
  maxResults?: number; // default 20
}

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function searchBusinesses(params: SearchParams): Promise<PlaceResult[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_PLACES_API_KEY environment variable is not set');
  }

  const apiKey = GOOGLE_API_KEY; // local ref for type narrowing
  const query = `${params.niche} in ${params.city}${params.state ? ', ' + params.state : ''}`;
  const results: PlaceResult[] = [];
  let nextPageToken: string | undefined;

  // Text search for broader results
  const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('key', apiKey);
  if (params.radius) searchUrl.searchParams.set('radius', String(params.radius));

  let attempts = 0;
  const maxPages = Math.ceil((params.maxResults || 20) / 20);

  do {
    if (nextPageToken) {
      // Google requires a short delay before using next_page_token
      await sleep(2000);
      searchUrl.searchParams.set('pagetoken', nextPageToken);
    }

    const response = await fetch(searchUrl.toString());
    if (!response.ok) {
      throw new Error(`Google Places API HTTP error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as any;

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} — ${data.error_message || ''}`);
    }

    for (const place of (data.results || [])) {
      results.push({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number || '',
        website: null, // need details call for this
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        types: place.types || [],
        permanentlyClosed: place.business_status === 'CLOSED_PERMANENTLY',
      });
    }

    nextPageToken = data.next_page_token;
    attempts++;
  } while (nextPageToken && attempts < maxPages);

  // Enrich with details (website, phone)
  const enriched = await Promise.all(
    results.slice(0, params.maxResults || 20).map(r => enrichPlaceDetails(r))
  );

  return enriched.filter(r => !r.permanentlyClosed);
}

async function enrichPlaceDetails(place: PlaceResult): Promise<PlaceResult> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', place.placeId);
    url.searchParams.set('fields', 'website,formatted_phone_number,url');
    url.searchParams.set('key', GOOGLE_API_KEY!); // safe: only called after searchBusinesses validates key

    const response = await fetch(url.toString());
    if (!response.ok) return place;
    const data = await response.json() as any;

    if (data.result) {
      place.website = data.result.website || null;
      place.phone = data.result.formatted_phone_number || place.phone;
    }
  } catch (e) {
    // Non-critical, continue with what we have
  }
  return place;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
