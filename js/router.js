/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * router.js
 * ==========================================================
 */

class Router {

    constructor() {

        this.routes = {

            "/": {
                page: "home"
            },

            "/lesson": {
                page: "lesson"
            },

            "/summary": {
                page: "summary"
            },

            "/review": {
                page: "review"
            }

        };

    }

    /**
     * ----------------------------------------------------------
     * Resolve current hash
     * ----------------------------------------------------------
     */

    resolve() {

        let hash = window.location.hash || "#/lesson";

        hash = hash.replace("#", "");

        const [path, queryString] = hash.split("?");

        const route =
            this.routes[path] ||
            this.routes["/lesson"];

        return {

            page: route.page,

            path,

            query: this.parseQuery(queryString)

        };

    }

    /**
     * ----------------------------------------------------------
     * Parse query string
     * lesson?id=lesson01&step=2
     * ----------------------------------------------------------
     */

    parseQuery(queryString = "") {

        const result = {};

        if (!queryString)
            return result;

        const params =
            new URLSearchParams(queryString);

        params.forEach((value, key) => {

            result[key] = value;

        });

        return result;

    }

    /**
     * ----------------------------------------------------------
     * Navigate
     * ----------------------------------------------------------
     */

    go(path = "/lesson", query = {}) {

        const search =
            this.buildQuery(query);

        location.hash =
            `#${path}${search}`;

    }

    /**
     * ----------------------------------------------------------
     * Replace
     * ----------------------------------------------------------
     */

    replace(path = "/lesson", query = {}) {

        const search =
            this.buildQuery(query);

        history.replaceState(

            {},

            "",

            `#${path}${search}`

        );

        window.dispatchEvent(

            new HashChangeEvent("hashchange")

        );

    }

    /**
     * ----------------------------------------------------------
     * Build Query
     * ----------------------------------------------------------
     */

    buildQuery(query = {}) {

        const params =
            new URLSearchParams();

        Object.keys(query).forEach(key => {

            if (

                query[key] !== undefined &&

                query[key] !== null &&

                query[key] !== ""

            ) {

                params.append(

                    key,

                    query[key]

                );

            }

        });

        const text = params.toString();

        return text
            ? `?${text}`
            : "";

    }

    /**
     * ----------------------------------------------------------
     * Back
     * ----------------------------------------------------------
     */

    back() {

        history.back();

    }

    /**
     * ----------------------------------------------------------
     * Forward
     * ----------------------------------------------------------
     */

    forward() {

        history.forward();

    }

    /**
     * ----------------------------------------------------------
     * Current Route
     * ----------------------------------------------------------
     */

    current() {

        return this.resolve();

    }

}

export default Router;