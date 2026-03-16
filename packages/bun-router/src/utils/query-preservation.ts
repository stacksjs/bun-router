/**
 * Query Parameter Preservation
 *
 * Automatically preserves specified query parameters across navigation.
 * This is useful for maintaining state like siteId, theme, locale, etc.
 */

export interface QueryPreservationConfig {
  /**
   * Whether query preservation is enabled
   * Default: true when preserve array is non-empty
   */
  enabled?: boolean

  /**
   * Query parameters to preserve across navigation
   * Example: ['siteId', 'theme', 'locale']
   */
  preserve?: string[]

  /**
   * Query parameters to never preserve (takes precedence over preserve)
   * Example: ['_t', 'utm_source']
   */
  exclude?: string[]

  /**
   * URL patterns where preservation should apply
   * Default: all internal links (same origin)
   * Example: ['/dashboard/*', '/admin/*']
   */
  routes?: string[]
}

/**
 * Default configuration
 */
export const defaultQueryPreservationConfig: QueryPreservationConfig = {
  enabled: true,
  preserve: [],
  exclude: ['_t', '_cache', 'callback'],
  routes: [],
}

/* eslint-disable prefer-const */
/**
 * Generate the client-side script for query preservation
 * This script intercepts link clicks and preserves specified query params
 */
export function generateQueryPreservationScript(config: QueryPreservationConfig): string {
  const { preserve = [], exclude = [], routes = [] } = config

  if (!preserve.length) {
    return ''
  }

  // Minified but readable client-side script
  return `<script data-query-preservation>
(function(){
  var preserve = ${JSON.stringify(preserve)};
  var exclude = ${JSON.stringify(exclude)};
  var routes = ${JSON.stringify(routes)};

  function shouldPreserve(href) {
    // Only preserve for same-origin links
    try {
      var url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      // Check route patterns if specified
      if (routes.length) {
        var path = url.pathname;
        return routes.some(function(pattern) {
          if (pattern.endsWith('*')) {
            return path.startsWith(pattern.slice(0, -1));
          }
          return path === pattern || path.startsWith(pattern + '/');
        });
      }
      return true;
    }
catch (e) { return false; }
  }

  function getPreservedParams() {
    var current = new URLSearchParams(window.location.search);
    var preserved = {};
    preserve.forEach(function(key) {
      if (current.has(key) && exclude.indexOf(key) === -1) {
        preserved[key] = current.get(key);
      }
    });
    return preserved;
  }

  function enhanceUrl(href) {
    var url = new URL(href, window.location.origin);
    var preserved = getPreservedParams();
    Object.keys(preserved).forEach(function(key) {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, preserved[key]);
      }
    });
    return url.toString();
  }

  // Intercept all link clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('mailto:') || href.startsWith('tel:')) return;

    if (!shouldPreserve(href)) return;

    // Check if link already has all preserved params
    var enhanced = enhanceUrl(href);
    if (enhanced !== new URL(href, window.location.origin).toString()) {
      e.preventDefault();
      window.location.href = enhanced;
    }
  });

  // Expose API for programmatic navigation
  window.__preserveQuery = {
    enhance: enhanceUrl,
    getPreserved: getPreservedParams,
    navigate: function(href) {
      window.location.href = enhanceUrl(href);
    }
  };
})();
</script>`
}

/**
 * Inject the query preservation script into HTML content
 * Inserts before </head> or </body> if </head> not found
 */
export function injectQueryPreservationScript(
  html: string,
  config: QueryPreservationConfig
): string {
  if (!config.enabled || !config.preserve?.length) {
    return html
  }

  const script = generateQueryPreservationScript(config)
  if (!script) {
    return html
  }

  // Try to inject before </head> for early execution
  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}\n</head>`)
  }

  // Fallback: inject before </body>
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}\n</body>`)
  }

  // Last resort: append to end
  return html + script
}

/**
 * Build a URL with preserved query parameters
 * Server-side utility for generating links
 */
export function buildUrlWithPreservedParams(
  path: string,
  currentUrl: string | URL,
  config: QueryPreservationConfig,
  additionalParams?: Record<string, string>
): string {
  const current = typeof currentUrl === 'string' ? new URL(currentUrl) : currentUrl
  const target = new URL(path, current.origin)

  // Preserve specified params from current URL
  if (config.preserve) {
    for (const key of config.preserve) {
      if (current.searchParams.has(key) && !config.exclude?.includes(key)) {
        if (!target.searchParams.has(key)) {
          target.searchParams.set(key, current.searchParams.get(key)!)
        }
      }
    }
  }

  // Add any additional params
  if (additionalParams) {
    for (const [key, value] of Object.entries(additionalParams)) {
      target.searchParams.set(key, value)
    }
  }

  return target.pathname + target.search
}
