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
    if (!productId) return;

    function init() {
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

    function mountButton(config) {
      var addToCartBtn =
        document.querySelector('[name="add"]') ||
        document.querySelector(".product-form__submit") ||
        document.querySelector('button[type="submit"][name="add"]');

      if (addToCartBtn) {
        addToCartBtn.style.display = "none";
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
