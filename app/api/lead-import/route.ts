import { load } from "cheerio";
import { identity, allowed, HttpError, rows, writeRecord } from "@/lib/server";
export const dynamic = "force-dynamic";
const hits = new Map<string, number>();
const clean = (x: any) =>
    String(x || "")
      .replace(/\s+/g, " ")
      .trim(),
  mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  tel = /^(?:\+|00)?[\d\s().-]{8,20}$/;
const emailWithoutJoinedPhone = (value: string) =>
  value
    .replace(/^[-._+]+/, "")
    .replace(/^(?:(?:\+?962|00962|0)?7\d{7,10})(?=[A-Za-z])/i, "");
function target(raw: string) {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new HttpError(400, "Enter a valid public http(s) URL.");
  }
  if (
    !/^https?:$/.test(u.protocol) ||
    u.username ||
    u.password ||
    !["", "80", "443"].includes(u.port)
  )
    throw new HttpError(
      400,
      "Only public http(s) URLs on standard ports are allowed.",
    );
  const h = u.hostname.toLowerCase(),
    m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h),
    bad =
      h === "localhost" ||
      h.endsWith(".local") ||
      h.endsWith(".internal") ||
      h === "::1" ||
      h.startsWith("fc") ||
      h.startsWith("fd") ||
      (!!m &&
        (+m[1] === 10 ||
          +m[1] === 127 ||
          +m[1] === 0 ||
          (+m[1] === 169 && +m[2] === 254) ||
          (+m[1] === 192 && +m[2] === 168) ||
          (+m[1] === 172 && +m[2] >= 16 && +m[2] <= 31)));
  if (bad) throw new HttpError(400, "Private and local addresses are blocked.");
  return u;
}
function decodedPath(u: URL) {
  try {
    return decodeURIComponent(u.pathname);
  } catch {
    return u.pathname;
  }
}
function abs(x: string, b: string) {
  try {
    return new URL(x, b).toString();
  } catch {
    return "";
  }
}
async function page(raw: string) {
  let u = target(raw);
  for (let i = 0; i < 4; i++) {
    const c = new AbortController(),
      t = setTimeout(() => c.abort(), 12000);
    let r: Response;
    try {
      r = await fetch(u, {
        redirect: "manual",
        signal: c.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "CheckMate-Lead-Import/1.0",
        },
      });
    } finally {
      clearTimeout(t);
    }
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      u = target(new URL(r.headers.get("location") || "", u).toString());
      continue;
    }
    if ([401, 403, 429].includes(r.status))
      throw new HttpError(403, "This website restricts automated access.");
    if (
      !r.ok ||
      !/text\/html|application\/xhtml/i.test(
        r.headers.get("content-type") || "",
      )
    )
      throw new HttpError(
        400,
        "The URL must point to an accessible HTML page.",
      );
    return { url: u.toString(), html: (await r.text()).slice(0, 1500000) };
  }
  throw new HttpError(400, "Too many redirects.");
}
function nshamah(html: string, url: string) {
  const $ = load(html),
    json: any[] = [];
  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      const x = JSON.parse($(e).text());
      json.push(...(Array.isArray(x) ? x : [x]));
    } catch {}
  });
  const org =
      json.find((x) =>
        /EducationalOrganization|School|Organization/.test(
          String(x?.["@type"]),
        ),
      ) || {},
    h1 = clean($("main h1").first().text()),
    heading = $("h1,h2,h3,h4")
      .filter((_, e) =>
        /معلومات التواصل|contact information/i.test(clean($(e).text())),
      )
      .first(),
    section = heading.length ? heading.parent().parent() : $("main"),
    txt = clean(section.text()),
    emails = [
      ...new Set(
        (txt.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [])
          .map(emailWithoutJoinedPhone)
          .filter((x) => mail.test(x)),
      ),
    ],
    phones = [
      ...new Set(
        (txt.match(/(?:\+|00)?[\d\s().-]{8,20}/g) || [])
          .map(clean)
          .filter((x) => tel.test(x)),
      ),
    ],
    imgs = [
      ...new Set(
        $("main img")
          .map((_, e) => abs($(e).attr("src") || "", url))
          .get()
          .filter((x) =>
            /storage\.nshamah\.com\/nshamah-vault\/education\/school\//.test(x),
          ),
      ),
    ],
    path = decodedPath(new URL(url)).split("/").filter(Boolean),
    schoolsIndex = path.findIndex((part) => part === "schools"),
    cityFromPath = clean(path[schoolsIndex + 1]),
    slug = clean(path.at(-1)?.replace(/-/g, " ") || "");
  return {
    name: h1 || clean(org.name) || slug,
    emails: emails.length
      ? emails
      : mail.test(org.email || "")
        ? [org.email]
        : [],
    phones: phones.length
      ? phones
      : tel.test(org.telephone || "")
        ? [clean(org.telephone)]
        : [],
    address: clean(org.address?.streetAddress),
    // Nshamah puts the city in the URL; structured data can incorrectly say
    // "Jordan", which is the country rather than the city.
    city: cityFromPath || clean(org.address?.addressLocality),
    area: "",
    website: "",
    description: clean(org.description),
    // Nshamah's first school image is the best available logo/identity image.
    logoUrl: imgs[0] || "",
    coverImageUrl: imgs[0] || "",
    galleryImages: imgs,
  };
}
function extract(html: string, url: string) {
  const u = new URL(url);
  let f: any;
  if (u.hostname.replace(/^www\./, "") === "nshamah.com")
    f = nshamah(html, url);
  else {
    const $ = load(html),
      imgs = $("main img")
        .map((_, e) => abs($(e).attr("src") || "", url))
        .get()
        .filter(Boolean);
    f = {
      name:
        clean($("main h1").first().text()) ||
        clean($("title").text()).split("|")[0],
      emails: [],
      phones: [],
      address: "",
      city: "",
      area: "",
      website: url,
      description: clean($("meta[name=description]").attr("content")),
      logoUrl: "",
      coverImageUrl: imgs[0] || "",
      galleryImages: imgs,
    };
  }
  const fields = {
    ...f,
    logo: f.logoUrl,
    images: f.galleryImages,
    socialLinks: [],
  };
  return {
    fields,
    missing: Object.entries(fields)
      .filter(([, v]) => !v || (Array.isArray(v) && !v.length))
      .map(([k]) => k),
    uncertain: u.hostname.includes("nshamah")
      ? []
      : ["name", "address", "city"],
    extractedAt: new Date().toISOString(),
  };
}
const same = (rs: any[], v: string) => {
  const n = (x: any) =>
    clean(x)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  return rs
    .filter((r) => v && n(r.name) === n(v))
    .map((r) => ({ id: r.id, name: r.name, status: r.status }));
};
export async function POST(req: Request) {
  try {
    const user = await identity();
    if (!allowed(user, "organizations", undefined, true))
      throw new HttpError(403, "Your role cannot add organizations.");
    const b: any = await req.json();
    if (Date.now() - (hits.get(user.workspace) || 0) < 3000)
      throw new HttpError(429, "Please wait before another import.");
    hits.set(user.workspace, Date.now());
    if (b.action === "preview") {
      const p = await page(b.url),
        x = extract(p.html, p.url),
        l = await rows("leads", user.workspace),
        o = await rows("organizations", user.workspace);
      return Response.json({
        ...x,
        sourceUrl: p.url,
        decodedPathname: decodedPath(new URL(p.url)),
        duplicates: {
          leads: same(l, x.fields.name),
          organizations: same(o, x.fields.name),
        },
      });
    }
    if (b.action === "create") {
      const x = b.preview,
        f = x?.fields;
      if (!f?.name)
        throw new HttpError(400, "A reviewed organization name is required.");
      target(x.sourceUrl);
      const l = await rows("leads", user.workspace),
        o = await rows("organizations", user.workspace);
      if (same(l, f.name).length || same(o, f.name).length)
        throw new HttpError(
          409,
          "A matching lead or organization already exists.",
        );
      const s = new Set(b.selected || []),
        k = (a: string, v: any) => (s.has(a) ? v : undefined),
        custom = {
          sourceUrl: x.sourceUrl,
          extractionDate: x.extractedAt,
          area: k("area", f.area),
          description: k("description", f.description),
          logoUrl: k("logo", f.logoUrl),
          coverImageUrl: k("images", f.coverImageUrl),
          galleryImages: k("images", f.galleryImages),
        };
      const organization = await writeRecord(user, "organizations", {
        name: f.name,
        type: "Private School",
        status: "Prospect",
        email: k("emails", f.emails[0]),
        phone: k("phones", f.phones[0]),
        city: k("city", f.city),
        address: k("address", f.address),
        website: k("website", f.website),
        custom,
      });
      return Response.json({ organization });
    }
    throw new HttpError(400, "Unknown import action.");
  } catch (e: any) {
    return Response.json(
      {
        error:
          e instanceof HttpError ? e.message : "Unable to import this page.",
      },
      { status: e.status || 400 },
    );
  }
}
