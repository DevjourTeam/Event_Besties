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

      var editorUrl =
        BASE_URL +
        "/editor/" +
        encodeURIComponent(productId) +
        (variantId ? "?variantId=" + encodeURIComponent(variantId) : "");

      var overlay = document.createElement("div");
      overlay.setAttribute("data-eb-overlay", "1");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);" +
        "display:flex;align-items:center;justify-content:center;";

      var iframe = document.createElement("iframe");
      iframe.src = editorUrl;
      iframe.style.cssText =
        "width:95vw;height:90vh;border:none;border-radius:12px;background:#fff;";
      iframe.allow = "clipboard-write";

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "×";
      closeBtn.setAttribute("aria-label", "Close editor");
      closeBtn.style.cssText =
        "position:fixed;top:14px;right:18px;width:36px;height:36px;" +
        "border-radius:50%;border:none;background:#1a1a1a;color:#fff;" +
        "font-size:22px;cursor:pointer;z-index:100000;line-height:1;";
      closeBtn.addEventListener("click", cleanup);

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) cleanup();
      });

      function onMessage(e) {
        if (!e.data || e.data.type !== "DESIGN_READY" || !e.data.payload) return;
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
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (closeBtn.parentNode) closeBtn.parentNode.removeChild(closeBtn);
      }

      window.addEventListener("message", onMessage);
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
