/**
 * Event Besties — Shopify embed script.
 *
 * Drop into a Shopify theme's product.liquid template:
 *   <script src="https://event-besties.vercel.app/embed.js"></script>
 *
 * Behavior:
 *   1. Read product id from window.ShopifyAnalytics.meta.product
 *   2. Fetch /api/editor/config/[productId] to check whether this product
 *      is configured as an Event Besties template or canvas
 *   3. If yes: hide the native Add to Cart button, inject a gold
 *      "Customize & Order" button
 *   4. On click, open the Event Besties editor in a full-screen iframe
 *      modal and listen for a DESIGN_ADDED_TO_CART postMessage
 *
 * Fail silently — never break the Shopify product page.
 */
(function () {
  try {
    // The base URL is derived from this script's own src so the same file
    // works across staging, localhost, and production deployments.
    var scriptEl = document.currentScript;
    if (!scriptEl) {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && /\/embed\.js(\?|$)/.test(scripts[i].src)) {
          scriptEl = scripts[i];
          break;
        }
      }
    }
    if (!scriptEl || !scriptEl.src) return;
    var BASE_URL = new URL(scriptEl.src).origin;

    var productId =
      (window.ShopifyAnalytics &&
        window.ShopifyAnalytics.meta &&
        window.ShopifyAnalytics.meta.product &&
        window.ShopifyAnalytics.meta.product.id) ||
      null;

    function init() {
      // Cart thumbnail swap runs on every page (cart page, drawer, mini-cart) —
      // it is independent of being on a product page.
      swapCartThumbnails();

      // The product-page button logic only applies when we are on a configured
      // product page.
      if (!productId) return;
      fetch(BASE_URL + "/api/editor/config/" + encodeURIComponent(productId))
        .then(function (r) {
          if (!r.ok) return null;
          return r.json();
        })
        .then(function (config) {
          if (!config || !config.type) return;
          mountButton(config);
        })
        .catch(function () {
          /* swallow */
        });
    }

    /**
     * Show the customer's DESIGN as the cart line-item thumbnail instead of the
     * generic product photo.
     *
     * The design preview is already stored on each line item as the `_Preview`
     * property when it is added to the cart. Shopify has no cart-API field for a
     * per-line image, so the theme keeps showing the product photo — we read the
     * cart via /cart.js and swap each line's thumbnail to its `_Preview` URL.
     *
     * Matching is done by variant id and by the line-item key (both are exposed
     * by most themes as data-* attributes or in variant links), with a safe
     * fallback that never touches an image it cannot confidently match — so a
     * "you may also like" product card is never affected.
     */
    function swapCartThumbnails() {
      fetch("/cart.js", { headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (cart) {
          if (!cart || !cart.items || !cart.items.length) return;

          // Build lookups: variantId -> previewUrl and lineKey -> previewUrl,
          // only for lines that actually carry a design.
          var byVariant = {};
          var byKey = {};
          for (var i = 0; i < cart.items.length; i++) {
            var it = cart.items[i];
            var props = it.properties || {};
            var preview = props["_Preview"] || props["_preview_url"];
            if (!preview) continue;
            if (it.variant_id) byVariant[String(it.variant_id)] = preview;
            if (it.key) byKey[String(it.key)] = preview;
          }
          if (!Object.keys(byVariant).length && !Object.keys(byKey).length) {
            return;
          }

          applyThumbSwap(byVariant, byKey);
          // Cart re-renders on quantity change; keep applying.
          if (window.MutationObserver && !window.__ebCartObserver) {
            window.__ebCartObserver = new MutationObserver(function () {
              applyThumbSwap(byVariant, byKey);
            });
            window.__ebCartObserver.observe(document.body, {
              childList: true,
              subtree: true,
            });
          }
        })
        .catch(function () {
          /* swallow — never break the cart */
        });
    }

    function applyThumbSwap(byVariant, byKey) {
      // Candidate line-item containers across common theme structures.
      var rows = document.querySelectorAll(
        "[data-line-item-key],[data-key],[data-cart-item],.cart-item,.cart__row,.cart-line-item,tr[data-variant-id]"
      );
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var preview = null;

        var key =
          row.getAttribute("data-line-item-key") ||
          row.getAttribute("data-key");
        if (key && byKey[key]) preview = byKey[key];

        if (!preview) {
          // Find a variant id: a data attribute, or a variant= link, or an input.
          var vid = row.getAttribute("data-variant-id");
          if (!vid) {
            var a = row.querySelector('a[href*="variant="]');
            if (a) {
              var m = a.getAttribute("href").match(/variant=(\d+)/);
              if (m) vid = m[1];
            }
          }
          if (!vid) {
            var inp = row.querySelector('[name="id"],[data-variant-id]');
            if (inp)
              vid = inp.value || inp.getAttribute("data-variant-id") || "";
          }
          if (vid && byVariant[String(vid)]) preview = byVariant[String(vid)];
        }

        if (!preview) continue;
        var img = row.querySelector("img");
        if (img && img.getAttribute("src") !== preview) {
          img.setAttribute("src", preview);
          img.setAttribute("srcset", "");
          img.removeAttribute("data-src");
        }
      }
    }

    // The variant the customer currently has selected, per the product form.
    function currentVariantId() {
      var idEl = document.querySelector('[name="id"]');
      return idEl && idEl.value ? String(idEl.value) : "";
    }

    // The size that variant corresponds to — null when the product has no sizes,
    // or when nothing valid is selected yet.
    function selectedSize(config) {
      var sizes = config.variants || [];
      if (!sizes.length) return null;
      var id = currentVariantId();
      if (!id) return null;
      for (var i = 0; i < sizes.length; i++) {
        if (String(sizes[i].variantId) === id) return sizes[i];
      }
      return null;
    }

    // The native "Add to cart" is left working. Only the express / dynamic
    // checkout buttons ("Buy it now", Shop Pay, Apple Pay, Google Pay, PayPal)
    // are removed — those jump straight to payment and skip the cart, which is
    // where the customer's design would otherwise be reviewed. Themes render
    // these under several class names and re-inject them after load, so the set
    // is broad and re-applied.
    var EXPRESS_SELECTORS = [
      ".shopify-payment-button", // dynamic checkout wrapper
      ".shopify-payment-button__button", // the actual express button
      '[data-shopify="payment-button"]',
      ".dynamic-checkout__content",
    ];

    function removeExpressCheckout() {
      for (var i = 0; i < EXPRESS_SELECTORS.length; i++) {
        var nodes = document.querySelectorAll(EXPRESS_SELECTORS[i]);
        for (var j = 0; j < nodes.length; j++) {
          nodes[j].style.setProperty("display", "none", "important");
          if ("disabled" in nodes[j]) nodes[j].disabled = true;
        }
      }
    }

    function mountButton(config) {
      var addToCartBtn =
        document.querySelector('[name="add"]') ||
        document.querySelector(".product-form__submit") ||
        document.querySelector('button[type="submit"][name="add"]');

      removeExpressCheckout();
      // Some themes render the dynamic checkout button a beat after our script
      // runs; re-apply for a few seconds, and again on any DOM change, so it can
      // never reappear.
      var reapply = setInterval(removeExpressCheckout, 400);
      setTimeout(function () {
        clearInterval(reapply);
      }, 6000);
      if (window.MutationObserver) {
        var mo = new MutationObserver(removeExpressCheckout);
        mo.observe(document.body, { childList: true, subtree: true });
      }

      var hasSizes = (config.variants || []).length > 0;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText =
        "display:block;width:100%;padding:14px 24px;" +
        "border:none;border-radius:8px;font-size:15px;font-weight:700;" +
        "letter-spacing:0.02em;transition:background 0.15s;margin-top:8px;";

      var enabled = false;

      // On a sized product the button stays dead until a size is picked, so the
      // customer can never design at a size they did not choose. The chosen size
      // is spelled out on the button — some themes preselect a variant, and the
      // customer must still see which one they are about to design at.
      function sync() {
        var size = hasSizes ? selectedSize(config) : null;
        enabled = !hasSizes || !!size;

        if (!enabled) {
          btn.textContent = "Choose a size first";
          btn.style.background = "#9a9a9a";
          btn.style.color = "#fff";
          btn.style.cursor = "not-allowed";
          btn.setAttribute("aria-disabled", "true");
          return;
        }
        btn.textContent = size
          ? "Customize & Order — " + size.label
          : "Customize & Order";
        btn.style.background = "#c8a96e";
        btn.style.color = "#fff";
        btn.style.cursor = "pointer";
        btn.removeAttribute("aria-disabled");
      }

      btn.addEventListener("mouseenter", function () {
        if (enabled) btn.style.background = "#b8996e";
      });
      btn.addEventListener("mouseleave", function () {
        if (enabled) btn.style.background = "#c8a96e";
      });
      btn.addEventListener("click", function () {
        if (!enabled) return;
        openEditor(config);
      });

      sync();

      // Themes update the variant in different ways — a <select>, swatch radios,
      // or JS that rewrites the hidden id input with no event we can hook. Listen
      // for changes AND poll the input, which catches every theme.
      document.addEventListener("change", sync, true);
      var lastId = currentVariantId();
      setInterval(function () {
        var id = currentVariantId();
        if (id !== lastId) {
          lastId = id;
          sync();
        }
      }, 300);

      if (addToCartBtn && addToCartBtn.parentNode) {
        addToCartBtn.parentNode.insertBefore(btn, addToCartBtn.nextSibling);
      } else {
        var form = document.querySelector(".product-form") || document.body;
        form.appendChild(btn);
      }
    }

    function openEditor(config) {
      var variantId = currentVariantId();

      // Set by the editor via postMessage: true while the canvas has objects
      // that would be lost on close/reload.
      var isDirty = false;
      var dialogEl = null;

      var editorUrl =
        BASE_URL +
        "/editor/" +
        encodeURIComponent(productId) +
        (variantId ? "?variantId=" + encodeURIComponent(variantId) : "");

      var overlay = document.createElement("div");
      overlay.setAttribute("data-eb-overlay", "1");
      // The editor iframe is transparent, so this backdrop is what shows around
      // the stage. Dim + blur it so the storefront reads as context behind the
      // editor rather than competing with it.
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:rgba(12,10,16,0.78);" +
        "-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);" +
        "display:flex;align-items:center;justify-content:center;";

      var iframe = document.createElement("iframe");
      iframe.src = editorUrl;
      // Transparent frame sized to the editor stage (1200x834 + padding), so the
      // dim backdrop surrounds it and clicks outside the editor close the modal.
      iframe.setAttribute("allowtransparency", "true");
      iframe.style.cssText =
        "width:min(1240px,96vw);height:min(870px,94vh);" +
        "border:none;background:transparent;";
      iframe.allow = "clipboard-write";

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "×";
      closeBtn.setAttribute("aria-label", "Close editor");
      closeBtn.style.cssText =
        "position:fixed;top:14px;right:18px;width:36px;height:36px;" +
        "border-radius:50%;border:none;background:#1a1a1a;color:#fff;" +
        "font-size:22px;cursor:pointer;z-index:100000;line-height:1;";
      closeBtn.addEventListener("click", requestClose);

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) requestClose();
      });

      // ---- unsaved-work guard ------------------------------------------
      // Reload / tab close: the browser's native "Leave site?" dialog.
      function onBeforeUnload(e) {
        if (!isDirty) return;
        e.preventDefault();
        e.returnValue = "";
        return "";
      }

      function removeDialog() {
        if (dialogEl && dialogEl.parentNode) dialogEl.parentNode.removeChild(dialogEl);
        dialogEl = null;
      }

      // Closing the modal (X or backdrop): our own two-button confirm.
      function requestClose() {
        if (!isDirty) return cleanup();
        if (dialogEl) return;
        dialogEl = buildConfirm();
        document.body.appendChild(dialogEl);
      }

      function buildConfirm() {
        var wrap = document.createElement("div");
        wrap.style.cssText =
          "position:fixed;inset:0;z-index:100001;background:rgba(12,10,16,0.6);" +
          "display:flex;align-items:center;justify-content:center;";
        var card = document.createElement("div");
        card.style.cssText =
          "background:#fff;border-radius:14px;padding:26px;max-width:380px;" +
          "width:calc(100% - 40px);box-shadow:0 24px 60px rgba(0,0,0,0.35);" +
          "font-family:system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;";
        var h = document.createElement("div");
        h.textContent = "Discard your design?";
        h.style.cssText =
          "font-size:17px;font-weight:700;color:#1b2333;margin-bottom:8px;";
        var p = document.createElement("p");
        p.textContent =
          "You have unsaved changes on the canvas. If you close now, your design will be lost.";
        p.style.cssText =
          "margin:0 0 20px;font-size:13px;line-height:1.6;color:#5a6172;";
        var row = document.createElement("div");
        row.style.cssText = "display:flex;gap:10px;";
        var keep = document.createElement("button");
        keep.type = "button";
        keep.textContent = "Keep editing";
        keep.style.cssText =
          "flex:1;height:42px;border-radius:9px;border:1px solid #d4d4da;" +
          "background:#fff;color:#1b2333;font-size:14px;font-weight:600;cursor:pointer;";
        var discard = document.createElement("button");
        discard.type = "button";
        discard.textContent = "Discard design";
        discard.style.cssText =
          "flex:1;height:42px;border-radius:9px;border:none;background:#e0563b;" +
          "color:#fff;font-size:14px;font-weight:600;cursor:pointer;";
        keep.addEventListener("click", removeDialog);
        discard.addEventListener("click", function () {
          isDirty = false;
          cleanup();
        });
        wrap.addEventListener("click", function (e) {
          if (e.target === wrap) removeDialog();
        });
        row.appendChild(keep);
        row.appendChild(discard);
        card.appendChild(h);
        card.appendChild(p);
        card.appendChild(row);
        wrap.appendChild(card);
        return wrap;
      }

      function onMessage(e) {
        if (!e.data) return;
        // Editor reports whether there is in-progress work worth warning about.
        if (e.data.type === "EB_DIRTY") {
          isDirty = !!e.data.dirty;
          return;
        }
        if (e.data.type !== "DESIGN_READY" || !e.data.payload) return;
        // The design is committed — never prompt on the redirect to /cart.
        isDirty = false;
        var p = e.data.payload;
        // Property keys starting with "_" are hidden from the customer in
        // the cart and order confirmation, but are visible to admins on the
        // order page. Shopify auto-linkifies URL values, so admins get
        // clickable Preview + Print file links on the line item.
        // All keys are "_"-prefixed: hidden from the customer, visible to admins
        // on the order. The shopper previews their design in the editor before
        // checkout, so no customer-facing preview link is needed here.
        var properties = {
          "_Print file": p.printUrl,
          "_Preview": p.previewUrl,
          _template_id: p.templateId,
          _design_type: p.designType,
        };
        if (p.customizationSummary) {
          properties.Customization = p.customizationSummary;
        }
        fetch("/cart/add.js", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            id: p.variantId,
            quantity: 1,
            properties: properties,
          }),
        })
          .then(function (r) {
            if (!r.ok) {
              return r.text().then(function (t) {
                throw new Error("cart/add.js " + r.status + ": " + t);
              });
            }
            return r.json();
          })
          .then(function () {
            cleanup();
            window.location.href = "/cart";
          })
          .catch(function (err) {
            console.error("[EventBesties]", err);
            alert("Could not add your design to the cart. Please try again.");
          });
      }

      function cleanup() {
        window.removeEventListener("message", onMessage);
        window.removeEventListener("beforeunload", onBeforeUnload);
        removeDialog();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (closeBtn.parentNode) closeBtn.parentNode.removeChild(closeBtn);
      }

      window.addEventListener("message", onMessage);
      window.addEventListener("beforeunload", onBeforeUnload);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);
      document.body.appendChild(closeBtn);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  } catch (e) {
    /* never break the host page */
  }
})();
