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

    function mountButton(config) {
      var addToCartBtn =
        document.querySelector('[name="add"]') ||
        document.querySelector(".product-form__submit") ||
        document.querySelector('button[type="submit"][name="add"]');

      if (addToCartBtn) {
        addToCartBtn.style.display = "none";
      }

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Customize & Order";
      btn.style.cssText =
        "display:block;width:100%;padding:14px 24px;" +
        "background:#c8a96e;color:#fff;border:none;border-radius:8px;" +
        "font-size:15px;font-weight:700;cursor:pointer;letter-spacing:0.02em;" +
        "transition:background 0.15s;margin-top:8px;";
      btn.addEventListener("mouseenter", function () {
        btn.style.background = "#b8996e";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.background = "#c8a96e";
      });
      btn.addEventListener("click", function () {
        openEditor(config);
      });

      if (addToCartBtn && addToCartBtn.parentNode) {
        addToCartBtn.parentNode.insertBefore(btn, addToCartBtn.nextSibling);
      } else {
        var form = document.querySelector(".product-form") || document.body;
        form.appendChild(btn);
      }
    }

    function openEditor(config) {
      var variantId = "";
      var idEl = document.querySelector('[name="id"]');
      if (idEl && idEl.value) variantId = idEl.value;

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
        var properties = {
          "_Print file": p.printUrl,
          "_Preview": p.previewUrl,
          _template_id: p.templateId,
          _design_type: p.designType,
          // No underscore = visible to the customer. Shopify auto-links URLs,
          // so the shopper gets a clickable preview of their design in the
          // cart, at checkout and in the confirmation email.
          "Design preview": p.previewUrl,
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
