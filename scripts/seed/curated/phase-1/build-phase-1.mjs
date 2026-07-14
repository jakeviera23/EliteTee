#!/usr/bin/env node
/**
 * Writes scripts/seed/curated/regions/phase-1/*.json from verified course records.
 * Run: node scripts/seed/curated/phase-1/build-phase-1.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../../../../", import.meta.url)));

function course(record) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

/** Verified US enrichments from official club/resort sources (Phase 1 research). */
const usVerifiedEnrichment = {
  "aronimink-golf-club": { architect: "Donald Ross", year_opened: 1928 },
  "bandon-dunes-golf-resort-pacific-dunes": {
    latitude: 43.18793,
    longitude: -124.39018,
    holes: 18,
  },
  "bandon-dunes-golf-resort-bandon-trails": {
    latitude: 43.18793,
    longitude: -124.39018,
    holes: 18,
  },
  "bandon-dunes-golf-resort-old-macdonald": {
    latitude: 43.18793,
    longitude: -124.39018,
    holes: 18,
  },
  "bandon-dunes-golf-resort-sheep-ranch": {
    latitude: 43.18793,
    longitude: -124.39018,
    holes: 18,
  },
  "colonial-country-club": { architect: "Gordon Lewis", holes: 18 },
  "crystal-downs-golf-club": { architect: "Alister MacKenzie" },
  "east-lake-golf-club": {
    holes: 18,
    architect: "Donald Ross",
    year_opened: 1908,
  },
  "firestone-country-club-south-course": {
    holes: 18,
    architect: "Bert Way; Robert Trent Jones Sr.",
    year_opened: 1929,
  },
  "harbour-town-golf-links": {
    website: "https://www.seapines.com/golf/courses/harbour-town-golf-links",
    holes: 18,
    architect: "Pete Dye; Jack Nicklaus",
  },
  "harding-park-golf-course": {
    holes: 18,
    architect: "Willie Watson; Sam Whiting",
    year_opened: 1925,
  },
  "hazeltine-national-golf-club": {
    holes: 18,
    architect: "Robert Trent Jones",
    year_opened: 1962,
  },
  "inverness-club": { architect: "Donald Ross", year_opened: 1903 },
  "palmetto-golf-club": {
    holes: 18,
    architect: "Leeds and James Mackrell",
    year_opened: 1892,
  },
  "pga-national-resort-champion-course": {
    website: "https://www.pgaresort.com/golf/courses/champion",
    holes: 18,
    architect: "Tom Fazio; George Fazio; Jack Nicklaus",
  },
  "pinehurst-resort-no-4": { holes: 18, architect: "Gil Hanse", year_opened: 1919 },
  "pinehurst-resort-no-8": { holes: 18, architect: "Tom Fazio", year_opened: 1996 },
  "sand-valley-golf-resort-sand-valley": {
    latitude: 44.171732,
    longitude: -89.855516,
    holes: 18,
    architect: "Bill Coore; Ben Crenshaw",
    year_opened: 2017,
    website: "https://www.sandvalley.com/golf-courses/sand-valley",
  },
  "sand-valley-golf-resort-mammoth-dunes": {
    latitude: 44.171732,
    longitude: -89.855516,
    holes: 18,
    architect: "David McLay Kidd",
    year_opened: 2018,
    website: "https://www.sandvalley.com/golf-courses/mammoth-dunes",
  },
  "scioto-country-club": { holes: 18, architect: "Donald Ross" },
  "streamsong-resort-red-course": {
    website: "https://www.streamsongresort.com/golf/streamsong-red/",
    holes: 18,
    architect: "Bill Coore; Ben Crenshaw",
    year_opened: 2012,
  },
  "streamsong-resort-blue-course": {
    website: "https://www.streamsongresort.com/golf/streamsong-blue/",
    holes: 18,
    architect: "Tom Doak",
    year_opened: 2012,
  },
  "the-country-club-brookline": {
    website: "https://www.tcc1882.org",
    year_opened: 1882,
  },
  "the-olympic-club-lake-course": { year_opened: 1912 },
  "tpc-southwind": { holes: 18, architect: "Ron Prichard" },
  "valhalla-golf-club": { architect: "Jack Nicklaus" },
};

function mergeUsRecord(record) {
  const extra = usVerifiedEnrichment[record.slug];
  if (!extra) return course(record);
  return course({ ...record, ...extra });
}

const unitedStatesRecords = [
  course({ name: "Pine Valley Golf Club", slug: "pine-valley-golf-club", city: "Pine Valley", region: "New Jersey", country: "United States", website: "https://www.pinevalleygolfclub.com", course_type: "parkland", access_type: "private", elite_tier: "global_icon", curated_tags: ["historic", "architecturally_significant", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Los Angeles Country Club", slug: "los-angeles-country-club", city: "Los Angeles", region: "California", country: "United States", website: "https://www.lacountryclub.com", course_type: "parkland", access_type: "private", elite_tier: "global_icon", curated_tags: ["championship", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Chicago Golf Club", slug: "chicago-golf-club", city: "Wheaton", region: "Illinois", country: "United States", website: "https://www.chicagogolfclub.org", course_type: "parkland", access_type: "private", elite_tier: "global_icon", curated_tags: ["historic", "architecturally_significant", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Crystal Downs Golf Club", slug: "crystal-downs-golf-club", city: "Frankfort", region: "Michigan", country: "United States", website: "https://www.crystaldowns.org", course_type: "links", access_type: "private", elite_tier: "global_icon", curated_tags: ["architecturally_significant", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Monterey Peninsula Country Club — Shore Course", slug: "monterey-peninsula-country-club-shore-course", city: "Pebble Beach", region: "California", country: "United States", website: "https://www.mpcc.org", course_type: "links", access_type: "private", elite_tier: "global_icon", curated_tags: ["championship", "links", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "The Olympic Club — Lake Course", slug: "the-olympic-club-lake-course", city: "San Francisco", region: "California", country: "United States", website: "https://www.olyclub.com", course_type: "parkland", access_type: "private", elite_tier: "global_icon", curated_tags: ["championship", "historic", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Pasatiempo Golf Club", slug: "pasatiempo-golf-club", city: "Santa Cruz", region: "California", country: "United States", website: "https://www.pasatiempo.org", course_type: "parkland", access_type: "private", elite_tier: "global_icon", curated_tags: ["architecturally_significant", "historic", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Medinah Country Club — Course No. 3", slug: "medinah-country-club-course-no-3", city: "Medinah", region: "Illinois", country: "United States", website: "https://www.medinahcc.org", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Oakland Hills Country Club — South Course", slug: "oakland-hills-country-club-south-course", city: "Bloomfield Hills", region: "Michigan", country: "United States", website: "https://www.oaklandhillscc.com", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Quail Hollow Club", slug: "quail-hollow-club", city: "Charlotte", region: "North Carolina", country: "United States", website: "https://www.quailhollowclub.com", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Aronimink Golf Club", slug: "aronimink-golf-club", city: "Newtown Square", region: "Pennsylvania", country: "United States", website: "https://www.aronimink.org", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "The Country Club — Brookline", slug: "the-country-club-brookline", city: "Brookline", region: "Massachusetts", country: "United States", website: "https://www.tccbrookline.org", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "historic", "private"], featured_status: "standard" }),
  course({ name: "Newport Country Club", slug: "newport-country-club", city: "Newport", region: "Rhode Island", country: "United States", website: "https://www.newportcc.org", course_type: "links", access_type: "private", elite_tier: "elite_private", curated_tags: ["historic", "private"], featured_status: "standard" }),
  course({ name: "Garden City Golf Club", slug: "garden-city-golf-club", city: "Garden City", region: "New York", country: "United States", website: "https://www.gardencitygolfclub.com", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["historic", "architecturally_significant", "private"], featured_status: "standard" }),
  course({ name: "Myopia Hunt Club", slug: "myopia-hunt-club", city: "Hamilton", region: "Massachusetts", country: "United States", website: "https://www.myopiahuntclub.com", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["historic", "private"], featured_status: "standard" }),
  course({ name: "Somerset Hills Country Club", slug: "somerset-hills-country-club", city: "Bernardsville", region: "New Jersey", country: "United States", website: "https://www.shcc1894.com", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["private"], featured_status: "standard" }),
  course({ name: "Palmetto Golf Club", slug: "palmetto-golf-club", city: "Aiken", region: "South Carolina", country: "United States", website: "https://www.palmettogolfclub.net", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["historic", "private"], featured_status: "standard" }),
  course({ name: "Yale Golf Course", slug: "yale-golf-course", city: "New Haven", region: "Connecticut", country: "United States", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["architecturally_significant", "private"], featured_status: "standard" }),
  course({ name: "Burning Tree Club", slug: "burning-tree-club", city: "Bethesda", region: "Maryland", country: "United States", website: "https://www.burningtreeclub.org", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["private"], featured_status: "standard" }),
  course({ name: "Old Elm Club", slug: "old-elm-club", city: "Highland Park", region: "Illinois", country: "United States", website: "https://www.oldelmclub.org", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["private"], featured_status: "standard" }),
  course({ name: "Butler National Golf Club", slug: "butler-national-golf-club", city: "Oak Brook", region: "Illinois", country: "United States", website: "https://www.butlernational.org", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Scioto Country Club", slug: "scioto-country-club", city: "Columbus", region: "Ohio", country: "United States", website: "https://www.sciotocc.com", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["historic", "private"], featured_status: "standard" }),
  course({ name: "Inverness Club", slug: "inverness-club", city: "Toledo", region: "Ohio", country: "United States", website: "https://www.invernessclub.com", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Shadow Creek Golf Course", slug: "shadow-creek-golf-course", city: "North Las Vegas", region: "Nevada", country: "United States", website: "https://www.mgmresorts.com/en/casinos/shadow-creek.html", course_type: "desert", access_type: "private", elite_tier: "elite_private", curated_tags: ["resort", "private", "bucket_list"], featured_status: "standard" }),
  course({ name: "Bandon Dunes Golf Resort — Pacific Dunes", slug: "bandon-dunes-golf-resort-pacific-dunes", city: "Bandon", region: "Oregon", country: "United States", website: "https://bandondunesgolf.com/golf/golf-courses/pacific-dunes-golf-course/", course_type: "links", access_type: "resort", architect: "Tom Doak", year_opened: 2001, elite_tier: "destination", curated_tags: ["resort", "links", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Bandon Dunes Golf Resort — Bandon Trails", slug: "bandon-dunes-golf-resort-bandon-trails", city: "Bandon", region: "Oregon", country: "United States", website: "https://bandondunesgolf.com/golf/golf-courses/bandon-trails-golf-course/", course_type: "links", access_type: "resort", architect: "Bill Coore; Ben Crenshaw", year_opened: 2005, elite_tier: "destination", curated_tags: ["resort", "links", "public_access"], featured_status: "standard" }),
  course({ name: "Bandon Dunes Golf Resort — Old Macdonald", slug: "bandon-dunes-golf-resort-old-macdonald", city: "Bandon", region: "Oregon", country: "United States", website: "https://bandondunesgolf.com/golf/golf-courses/old-macdonald-golf-course/", course_type: "links", access_type: "resort", architect: "Tom Doak; Jim Urbina", elite_tier: "destination", curated_tags: ["resort", "links", "public_access"], featured_status: "standard" }),
  course({ name: "Bandon Dunes Golf Resort — Sheep Ranch", slug: "bandon-dunes-golf-resort-sheep-ranch", city: "Bandon", region: "Oregon", country: "United States", website: "https://bandondunesgolf.com/golf/golf-courses/sheep-ranch-golf-course/", course_type: "links", access_type: "resort", architect: "Bill Coore; Ben Crenshaw", elite_tier: "destination", curated_tags: ["resort", "links", "public_access"], featured_status: "standard" }),
  course({ name: "Streamsong Resort — Red Course", slug: "streamsong-resort-red-course", city: "Bowling Green", region: "Florida", country: "United States", website: "https://www.streamsongresort.com/golf/red-course", course_type: "links", access_type: "resort", elite_tier: "destination", curated_tags: ["resort", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Streamsong Resort — Blue Course", slug: "streamsong-resort-blue-course", city: "Bowling Green", region: "Florida", country: "United States", website: "https://www.streamsongresort.com/golf/blue-course", course_type: "links", access_type: "resort", elite_tier: "destination", curated_tags: ["resort", "public_access"], featured_status: "standard" }),
  course({ name: "Sand Valley Golf Resort — Sand Valley", slug: "sand-valley-golf-resort-sand-valley", city: "Nekoosa", region: "Wisconsin", country: "United States", website: "https://www.sandvalley.com/golf/sand-valley", course_type: "links", access_type: "resort", elite_tier: "destination", curated_tags: ["resort", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Sand Valley Golf Resort — Mammoth Dunes", slug: "sand-valley-golf-resort-mammoth-dunes", city: "Nekoosa", region: "Wisconsin", country: "United States", website: "https://www.sandvalley.com/golf/mammoth-dunes", course_type: "links", access_type: "resort", elite_tier: "destination", curated_tags: ["resort", "public_access"], featured_status: "standard" }),
  course({ name: "Harbour Town Golf Links", slug: "harbour-town-golf-links", city: "Hilton Head Island", region: "South Carolina", country: "United States", website: "https://www.harbourtowngolflinks.com", course_type: "links", access_type: "resort", elite_tier: "destination", curated_tags: ["championship", "resort", "links", "public_access"], featured_status: "standard" }),
  course({ name: "Pinehurst Resort — No. 4", slug: "pinehurst-resort-no-4", city: "Pinehurst", region: "North Carolina", country: "United States", website: "https://www.pinehurst.com/golf/courses/no-4", course_type: "parkland", access_type: "resort", elite_tier: "destination", curated_tags: ["resort", "public_access"], featured_status: "standard" }),
  course({ name: "Pinehurst Resort — No. 8", slug: "pinehurst-resort-no-8", city: "Pinehurst", region: "North Carolina", country: "United States", website: "https://www.pinehurst.com/golf/courses/no-8", course_type: "parkland", access_type: "resort", elite_tier: "destination", curated_tags: ["resort", "public_access"], featured_status: "standard" }),
  course({ name: "TPC Southwind", slug: "tpc-southwind", city: "Memphis", region: "Tennessee", country: "United States", website: "https://tpc.com/southwind/", course_type: "parkland", access_type: "semi_private", elite_tier: "destination", curated_tags: ["championship", "public_access"], featured_status: "standard" }),
  course({ name: "East Lake Golf Club", slug: "east-lake-golf-club", city: "Atlanta", region: "Georgia", country: "United States", website: "https://www.eastlakegolfclub.com", course_type: "parkland", access_type: "private", elite_tier: "destination", curated_tags: ["championship", "historic", "private"], featured_status: "standard" }),
  course({ name: "Firestone Country Club — South Course", slug: "firestone-country-club-south-course", city: "Akron", region: "Ohio", country: "United States", website: "https://www.invitedclubs.com/clubs/firestone-country-club", course_type: "parkland", access_type: "private", elite_tier: "destination", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Colonial Country Club", slug: "colonial-country-club", city: "Fort Worth", region: "Texas", country: "United States", website: "https://www.colonialcc.com", course_type: "parkland", access_type: "private", elite_tier: "destination", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Valhalla Golf Club", slug: "valhalla-golf-club", city: "Louisville", region: "Kentucky", country: "United States", website: "https://www.valhallagolfclub.com", course_type: "parkland", access_type: "private", elite_tier: "destination", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Harding Park Golf Course", slug: "harding-park-golf-course", city: "San Francisco", region: "California", country: "United States", website: "https://tpc.com/hardingpark/", course_type: "parkland", access_type: "public", elite_tier: "destination", curated_tags: ["championship", "public_access"], featured_status: "standard" }),
  course({ name: "Atlanta Athletic Club — Highlands Course", slug: "atlanta-athletic-club-highlands-course", city: "Johns Creek", region: "Georgia", country: "United States", website: "https://www.atlantaathletic.org", course_type: "parkland", access_type: "private", elite_tier: "notable", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Hazeltine National Golf Club", slug: "hazeltine-national-golf-club", city: "Chaska", region: "Minnesota", country: "United States", website: "https://www.hazeltinenational.com", course_type: "parkland", access_type: "private", elite_tier: "notable", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Worcester Country Club", slug: "worcester-country-club", city: "Worcester", region: "Massachusetts", country: "United States", website: "https://www.worcestercc.com", course_type: "parkland", access_type: "private", elite_tier: "notable", curated_tags: ["historic", "private"], featured_status: "standard" }),
  course({ name: "Calusa Pines Golf Club", slug: "calusa-pines-golf-club", city: "Naples", region: "Florida", country: "United States", website: "https://www.calusapines.com", course_type: "parkland", access_type: "private", elite_tier: "notable", curated_tags: ["private"], featured_status: "standard" }),
  course({ name: "The Quarry at La Quinta", slug: "the-quarry-at-la-quinta", city: "La Quinta", region: "California", country: "United States", website: "https://www.thequarryatlaquinta.com", course_type: "desert", access_type: "private", elite_tier: "notable", curated_tags: ["private"], featured_status: "standard" }),
  course({ name: "Wolf Creek Golf Club", slug: "wolf-creek-golf-club", city: "Mesquite", region: "Nevada", country: "United States", website: "https://www.golfwolfcreek.com", course_type: "desert", access_type: "public", elite_tier: "notable", curated_tags: ["bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "PGA National Resort — Champion Course", slug: "pga-national-resort-champion-course", city: "Palm Beach Gardens", region: "Florida", country: "United States", website: "https://www.pgaresort.com/golf/champion-course", course_type: "parkland", access_type: "resort", elite_tier: "notable", curated_tags: ["championship", "resort", "public_access"], featured_status: "standard" }),
];

const unitedStates = unitedStatesRecords.map(mergeUsRecord);

const unitedKingdomIreland = [
  course({ name: "Royal Aberdeen Golf Club — Balgownie Course", slug: "royal-aberdeen-golf-club-balgownie-course", city: "Aberdeen", region: "Aberdeenshire", country: "Scotland", website: "https://www.royalaberdeengolf.com", course_type: "links", access_type: "private", architect: "Archie and Robert Simpson", year_opened: 1888, elite_tier: "global_icon", curated_tags: ["championship", "links", "historic", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Royal Porthcawl Golf Club", slug: "royal-porthcawl-golf-club", city: "Porthcawl", region: "Wales", country: "United Kingdom", website: "https://www.royalporthcawl.com", course_type: "links", access_type: "private", holes: 18, architect: "Ramsay Hunter", elite_tier: "global_icon", curated_tags: ["championship", "links", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Loch Lomond Golf Club", slug: "loch-lomond-golf-club", city: "Luss", region: "Dunbartonshire", country: "Scotland", website: "https://www.lochlomond.com", course_type: "parkland", access_type: "private", architect: "Tom Weiskopf", elite_tier: "elite_private", curated_tags: ["private", "bucket_list", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "Renaissance Club", slug: "renaissance-club", city: "North Berwick", region: "East Lothian", country: "Scotland", website: "https://trcaa.com", course_type: "links", access_type: "private", elite_tier: "elite_private", curated_tags: ["championship", "links", "private"], featured_status: "standard" }),
  course({ name: "Kingsbarns Golf Links", slug: "kingsbarns-golf-links", city: "Kingsbarns", region: "Fife", country: "Scotland", website: "https://www.kingsbarns.com", course_type: "links", access_type: "public", architect: "Kyle Phillips", year_opened: 2000, elite_tier: "destination", curated_tags: ["links", "bucket_list", "public_access", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "Castle Stuart Golf Links", slug: "castle-stuart-golf-links", city: "Inverness", region: "Highland", country: "Scotland", website: "https://cabot.com/highlands/golf/castle-stuart/", course_type: "links", access_type: "public", holes: 18, architect: "Gil Hanse and Mark Parsinen", year_opened: 2009, elite_tier: "destination", curated_tags: ["links", "public_access", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "Cruden Bay Golf Club", slug: "cruden-bay-golf-club", city: "Cruden Bay", region: "Aberdeenshire", country: "Scotland", website: "https://www.crudenbaygolfclub.co.uk", course_type: "links", access_type: "public", architect: "Old Tom Morris", year_opened: 1899, elite_tier: "destination", curated_tags: ["links", "bucket_list", "public_access", "historic"], featured_status: "standard" }),
  course({ name: "Tralee Golf Club", slug: "tralee-golf-club", city: "Tralee", region: "County Kerry", country: "Ireland", website: "https://www.traleegolfclub.com", course_type: "links", access_type: "public", architect: "Arnold Palmer", year_opened: 1984, elite_tier: "destination", curated_tags: ["links", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Waterville Golf Links", slug: "waterville-golf-links", city: "Waterville", region: "County Kerry", country: "Ireland", website: "https://www.watervillegolflinks.ie", course_type: "links", access_type: "public", holes: 18, architect: "Eddie Hackett and Tom Fazio", elite_tier: "destination", curated_tags: ["links", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Portmarnock Golf Club", slug: "portmarnock-golf-club", city: "Portmarnock", region: "County Dublin", country: "Ireland", website: "https://www.portmarnockgolfclub.ie", course_type: "links", access_type: "private", architect: "Mungo Park", year_opened: 1894, elite_tier: "destination", curated_tags: ["championship", "links", "private", "historic"], featured_status: "standard" }),
  course({ name: "The European Club", slug: "the-european-club", city: "Brittas Bay", region: "County Wicklow", country: "Ireland", website: "https://www.theeuropeanclub.com", course_type: "links", access_type: "private", architect: "Pat Ruddy", year_opened: 1993, elite_tier: "destination", curated_tags: ["links", "private", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "Adare Manor Golf Club", slug: "adare-manor-golf-club", city: "Adare", region: "County Limerick", country: "Ireland", website: "https://www.adaremanor.com/golf/", course_type: "parkland", access_type: "resort", holes: 18, architect: "Tom Fazio", year_opened: 2017, elite_tier: "destination", curated_tags: ["resort", "bucket_list", "public_access", "championship"], featured_status: "standard" }),
  course({ name: "Gleneagles Hotel — King's Course", slug: "gleneagles-hotel-kings-course", city: "Auchterarder", region: "Perth and Kinross", country: "Scotland", website: "https://www.gleneagles.com/golf", course_type: "parkland", access_type: "resort", holes: 18, architect: "James Braid", year_opened: 1919, elite_tier: "destination", curated_tags: ["resort", "historic", "public_access", "championship"], featured_status: "standard" }),
  course({ name: "North Berwick Golf Club — West Links", slug: "north-berwick-golf-club-west-links", city: "North Berwick", region: "East Lothian", country: "Scotland", website: "https://www.northberwickgolfclub.com", course_type: "links", access_type: "public", elite_tier: "destination", curated_tags: ["historic", "links", "public_access"], featured_status: "standard" }),
  course({ name: "Prestwick Golf Club", slug: "prestwick-golf-club", city: "Prestwick", region: "South Ayrshire", country: "Scotland", website: "https://www.prestwickgc.co.uk", course_type: "links", access_type: "private", architect: "Old Tom Morris", year_opened: 1851, elite_tier: "destination", curated_tags: ["historic", "championship", "links", "private"], featured_status: "standard" }),
  course({ name: "Royal Cinque Ports Golf Club", slug: "royal-cinque-ports-golf-club", city: "Deal", region: "Kent", country: "England", website: "https://www.royalcinqueports.com", course_type: "links", access_type: "private", holes: 18, architect: "Harry Hunter", year_opened: 1899, elite_tier: "destination", curated_tags: ["championship", "links", "private", "historic"], featured_status: "standard" }),
  course({ name: "Nairn Golf Club", slug: "nairn-golf-club", city: "Nairn", region: "Highland", country: "Scotland", website: "https://nairngolfclub.co.uk", course_type: "links", access_type: "public", architect: "Andrew Simpson", year_opened: 1887, elite_tier: "notable", curated_tags: ["links", "public_access", "historic"], featured_status: "standard" }),
];

const canada = [
  course({ name: "Cabot Cape Breton — Cabot Links", slug: "cabot-cape-breton-cabot-links", city: "Inverness", region: "Nova Scotia", country: "Canada", website: "https://www.cabotcapebreton.com/golf/cabot-links", course_type: "links", access_type: "resort", holes: 18, architect: "Rod Whitman", year_opened: 2012, elite_tier: "global_icon", curated_tags: ["resort", "links", "bucket_list", "public_access"], featured_status: "featured" }),
  course({ name: "Hamilton Golf and Country Club", slug: "hamilton-golf-and-country-club", city: "Ancaster", region: "Ontario", country: "Canada", website: "https://hgcc.ca", course_type: "parkland", access_type: "private", architect: "Harry Colt", year_opened: 1916, elite_tier: "elite_private", curated_tags: ["championship", "private", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "St. George's Golf and Country Club", slug: "st-georges-golf-and-country-club", city: "Toronto", region: "Ontario", country: "Canada", website: "https://www.stgeorgesgolfandcountryclub.com", course_type: "parkland", access_type: "private", holes: 18, architect: "Stanley Thompson", year_opened: 1929, elite_tier: "elite_private", curated_tags: ["championship", "private", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "Capilano Golf and Country Club", slug: "capilano-golf-and-country-club", city: "West Vancouver", region: "British Columbia", country: "Canada", website: "https://www.capilanogolf.com", course_type: "parkland", access_type: "private", architect: "Stanley Thompson", elite_tier: "elite_private", curated_tags: ["private", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "National Golf Club of Canada", slug: "national-golf-club-of-canada", city: "Woodbridge", region: "Ontario", country: "Canada", website: "https://nationalgolf.ca", course_type: "parkland", access_type: "private", elite_tier: "elite_private", curated_tags: ["private"], featured_status: "standard" }),
  course({ name: "Fairmont Banff Springs Golf Course", slug: "fairmont-banff-springs-golf-course", city: "Banff", region: "Alberta", country: "Canada", website: "https://www.fairmont.com/banff-springs/golf/", course_type: "mountain", access_type: "resort", holes: 18, architect: "Stanley Thompson", elite_tier: "destination", curated_tags: ["resort", "bucket_list", "public_access", "architecturally_significant"], featured_status: "standard" }),
  course({ name: "Jasper Park Lodge Golf Course", slug: "jasper-park-lodge-golf-course", city: "Jasper", region: "Alberta", country: "Canada", website: "https://www.fairmont.com/jasper/golf/the-fairmont-jasper-park-lodge-golf/", course_type: "mountain", access_type: "resort", architect: "Stanley Thompson", year_opened: 1925, elite_tier: "destination", curated_tags: ["resort", "architecturally_significant", "public_access", "historic"], featured_status: "standard" }),
  course({ name: "Glen Abbey Golf Club", slug: "glen-abbey-golf-club", city: "Oakville", region: "Ontario", country: "Canada", website: "https://glenabbey.clublink.ca", course_type: "parkland", access_type: "public", architect: "Jack Nicklaus", elite_tier: "destination", curated_tags: ["championship", "public_access"], featured_status: "standard" }),
];

const australiaNewZealand = [
  course({ name: "Royal Melbourne Golf Club — East Course", slug: "royal-melbourne-golf-club-east-course", city: "Black Rock", region: "Victoria", country: "Australia", website: "https://www.royalmelbourne.com.au/courses/the-east-course/", course_type: "heathland", access_type: "private", holes: 18, architect: "Alex Russell", year_opened: 1932, elite_tier: "global_icon", curated_tags: ["historic", "championship", "architecturally_significant", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Barnbougle Dunes", slug: "barnbougle-dunes", city: "Bridport", region: "Tasmania", country: "Australia", website: "https://barnbougle.com.au/play/the-dunes/", course_type: "links", access_type: "public", holes: 18, architect: "Tom Doak and Mike Clayton", year_opened: 2004, elite_tier: "global_icon", curated_tags: ["links", "resort", "bucket_list", "public_access"], featured_status: "featured" }),
  course({ name: "Victoria Golf Club", slug: "victoria-golf-club", city: "Cheltenham", region: "Victoria", country: "Australia", website: "https://victoriagolf.com.au", course_type: "heathland", access_type: "private", holes: 18, architect: "Alister MacKenzie", year_opened: 1927, elite_tier: "elite_private", curated_tags: ["historic", "championship", "architecturally_significant", "private"], featured_status: "standard" }),
  course({ name: "New South Wales Golf Club", slug: "new-south-wales-golf-club", city: "La Perouse", region: "New South Wales", country: "Australia", website: "https://www.nswgolfclub.com.au/cms/welcome/", course_type: "links", access_type: "private", holes: 18, architect: "Alister MacKenzie", year_opened: 1928, elite_tier: "elite_private", curated_tags: ["historic", "championship", "links", "private"], featured_status: "standard" }),
  course({ name: "Ellerston Golf Club", slug: "ellerston-golf-club", country: "Australia", elite_tier: "elite_private", curated_tags: ["private"], featured_status: "standard" }),
  course({ name: "Barnbougle Lost Farm", slug: "barnbougle-lost-farm", city: "Bridport", region: "Tasmania", country: "Australia", website: "https://barnbougle.com.au/play/lost-farm/", course_type: "links", access_type: "public", holes: 20, architect: "Coore & Crenshaw", year_opened: 2010, elite_tier: "destination", curated_tags: ["links", "resort", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Cape Wickham Links", slug: "cape-wickham-links", city: "King Island", region: "Tasmania", country: "Australia", website: "https://www.capewickham.com.au/tour/", course_type: "links", access_type: "public", holes: 18, architect: "Mike DeVries and Darius Oliver", year_opened: 2015, elite_tier: "destination", curated_tags: ["links", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Kauri Cliffs", slug: "kauri-cliffs", city: "Matauri Bay", region: "Northland", country: "New Zealand", website: "https://www.robertsonlodges.com/kauri-cliffs/the-course", course_type: "links", access_type: "public", holes: 18, architect: "David Harman", elite_tier: "destination", curated_tags: ["resort", "links", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Tara Iti", slug: "tara-iti", region: "Auckland", country: "New Zealand", website: "https://taraiti.com/about/", course_type: "links", access_type: "private", architect: "Tom Doak", elite_tier: "destination", curated_tags: ["links", "private", "bucket_list"], featured_status: "standard" }),
];

const europe = [
  course({ name: "Golf de Morfontaine", slug: "golf-de-morfontaine", city: "Mortefontaine", region: "Hauts-de-France", country: "France", website: "https://www.golfdemorfontaine.fr/en/", course_type: "heathland", access_type: "private", holes: 18, architect: "Tom Simpson", year_opened: 1927, elite_tier: "global_icon", curated_tags: ["historic", "championship", "architecturally_significant", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Golf Club München Eichenried", slug: "golf-club-munchen-eichenried", city: "Eichenried", region: "Bavaria", country: "Germany", website: "https://www.gc-eichenried.de/", course_type: "parkland", access_type: "private", holes: 18, architect: "Kurt Roßknecht", year_opened: 1989, elite_tier: "elite_private", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "PGA Catalunya Resort — Stadium Course", slug: "pga-catalunya-resort-stadium-course", city: "Girona", region: "Catalonia", country: "Spain", website: "https://www.camiral.com/en/golf/stadium-course", course_type: "parkland", access_type: "public", holes: 18, architect: "Neil Coles and Ángel Gallardo", year_opened: 1999, elite_tier: "destination", curated_tags: ["championship", "resort", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Finca Cortesín Golf Club", slug: "finca-cortesin-golf-club", city: "Casares", region: "Andalusia", country: "Spain", website: "https://fincacortesin.com/golf-costa-sol/", course_type: "parkland", access_type: "public", holes: 18, architect: "Cabell B. Robinson", elite_tier: "destination", curated_tags: ["championship", "resort", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Terre Blanche Hotel Spa Golf Resort", slug: "terre-blanche-hotel-spa-golf-resort", city: "Tourrettes", region: "Provence-Alpes-Côte d'Azur", country: "France", website: "https://www.terre-blanche.com/en/golf-resort-var", course_type: "parkland", access_type: "public", holes: 18, architect: "Dave Thomas", elite_tier: "destination", curated_tags: ["resort", "championship", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Thracian Cliffs Golf & Beach Resort", slug: "thracian-cliffs-golf-and-beach-resort", city: "Kavarna", region: "Dobrich", country: "Bulgaria", website: "https://thraciancliffs.com/golf/", course_type: "links", access_type: "public", holes: 18, architect: "Gary Player", year_opened: 2011, elite_tier: "destination", curated_tags: ["resort", "links", "bucket_list", "public_access"], featured_status: "standard" }),
];

const asia = [
  course({ name: "Royal Calcutta Golf Club", slug: "royal-calcutta-golf-club", city: "Kolkata", region: "West Bengal", country: "India", website: "https://rcgc.in/service/golf-course/", course_type: "parkland", access_type: "private", holes: 18, elite_tier: "global_icon", curated_tags: ["historic", "championship", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Kasumigaseki Country Club — East Course", slug: "kasumigaseki-country-club-east-course", city: "Kawagoe", region: "Saitama", country: "Japan", website: "https://www.kasumigasekicc.or.jp/english/history/01.html", course_type: "parkland", access_type: "private", holes: 18, architect: "Kinya Fujita and Shiro Akaboshi", year_opened: 1929, elite_tier: "global_icon", curated_tags: ["historic", "championship", "private", "bucket_list"], featured_status: "featured" }),
  course({ name: "Blue Canyon Country Club — Canyon Course", slug: "blue-canyon-country-club-canyon-course", city: "Thalang", region: "Phuket", country: "Thailand", website: "https://www.bluecanyonphuket.com/bc-golf-course/canyon-course/", course_type: "parkland", access_type: "public", holes: 18, architect: "Yoshikazu Kato", year_opened: 1991, elite_tier: "destination", curated_tags: ["championship", "resort", "public_access"], featured_status: "standard" }),
  course({ name: "Sentosa Golf Club — Tanjong Course", slug: "sentosa-golf-club-tanjong-course", city: "Singapore", region: "Singapore", country: "Singapore", website: "https://www.sentosagolf.com/the-tanjong/", course_type: "parkland", access_type: "private", holes: 18, elite_tier: "destination", curated_tags: ["championship", "private"], featured_status: "standard" }),
  course({ name: "Sheshan International Golf Club", slug: "sheshan-international-golf-club", city: "Shanghai", region: "Shanghai", country: "China", website: "https://www.sheshangolf.com/golfclub-qc.html", course_type: "parkland", access_type: "private", holes: 18, architect: "Nelson & Haworth", elite_tier: "destination", curated_tags: ["championship", "private", "bucket_list"], featured_status: "standard" }),
  course({ name: "Kawana Hotel Golf Course — Fuji Course", slug: "kawana-hotel-golf-course-fuji-course", city: "Ito", region: "Shizuoka", country: "Japan", website: "https://www.princehotels.com/en/golf/kawana/fuji/", course_type: "parkland", access_type: "public", holes: 18, architect: "C.H. Alison", year_opened: 1936, elite_tier: "destination", curated_tags: ["historic", "championship", "resort", "public_access"], featured_status: "standard" }),
];

const middleEast = [
  course({ name: "Yas Links", slug: "yas-links", city: "Abu Dhabi", region: "Abu Dhabi", country: "United Arab Emirates", website: "https://www.viyagolf.com/yaslinks/golf-course/", course_type: "links", access_type: "public", architect: "Kyle Phillips", elite_tier: "destination", curated_tags: ["links", "championship", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Abu Dhabi Golf Club — National Course", slug: "abu-dhabi-golf-club-national-course", city: "Abu Dhabi", region: "Abu Dhabi", country: "United Arab Emirates", website: "https://www.abudhabigolfclub.abudhabi/course-details", course_type: "parkland", access_type: "public", holes: 18, architect: "Peter Harradine", year_opened: 2000, elite_tier: "destination", curated_tags: ["championship", "resort", "public_access"], featured_status: "standard" }),
];

const otherDestinations = [
  course({ name: "Leopard Creek Country Club", slug: "leopard-creek-country-club", city: "Malalane", region: "Mpumalanga", country: "South Africa", website: "https://leopardcreek.co.za/leopard-creek-course/", course_type: "parkland", access_type: "private", holes: 18, elite_tier: "destination", curated_tags: ["championship", "private", "bucket_list"], featured_status: "standard" }),
  course({ name: "Durban Country Club", slug: "durban-country-club", city: "Durban", region: "KwaZulu-Natal", country: "South Africa", website: "https://durbancountryclub.co.za/", course_type: "links", access_type: "private", holes: 18, elite_tier: "destination", curated_tags: ["historic", "championship", "links", "private"], featured_status: "standard" }),
  course({ name: "Teeth of the Dog", slug: "teeth-of-the-dog", city: "La Romana", region: "La Romana", country: "Dominican Republic", website: "https://www.casadecampo.com.do/golf/teeth-of-the-dog/", course_type: "links", access_type: "public", holes: 18, architect: "Pete Dye", year_opened: 1971, elite_tier: "destination", curated_tags: ["championship", "resort", "links", "bucket_list", "public_access"], featured_status: "standard" }),
  course({ name: "Royal Johannesburg & Kensington Golf Club", slug: "royal-johannesburg-and-kensington-golf-club", city: "Johannesburg", region: "Gauteng", country: "South Africa", website: "https://royaljk.co.za/", course_type: "parkland", access_type: "private", holes: 18, architect: "Robert Grimsdell", year_opened: 1939, elite_tier: "destination", curated_tags: ["historic", "championship", "private"], featured_status: "standard" }),
];

const regions = [
  ["united-states.json", "United States", unitedStates],
  ["united-kingdom-ireland.json", "United Kingdom & Ireland", unitedKingdomIreland],
  ["canada.json", "Canada", canada],
  ["australia-new-zealand.json", "Australia & New Zealand", australiaNewZealand],
  ["europe.json", "Europe", europe],
  ["asia.json", "Asia", asia],
  ["middle-east.json", "Middle East", middleEast],
  ["other-destinations.json", "Other destination golf", otherDestinations],
];

const outDir = join(root, "scripts/seed/curated/regions/phase-1");
await mkdir(outDir, { recursive: true });

let total = 0;
for (const [filename, regionLabel, courses] of regions) {
  const payload = {
    version: 1,
    source_name: "elitetee_curated",
    region: regionLabel,
    phase: 1,
    courses,
  };
  const path = join(outDir, filename);
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  total += courses.length;
  console.log(`${filename}: ${courses.length} courses`);
}

const manifest = {
  version: 1,
  source_name: "elitetee_curated",
  description: "Phase 1 curated expansion batch (100 courses). Import after editorial review.",
  phase: 1,
  course_count: total,
  files: regions.map(([filename]) => `regions/phase-1/${filename}`),
};

await writeFile(
  join(root, "scripts/seed/curated/manifest.phase-1.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Total: ${total} courses`);
