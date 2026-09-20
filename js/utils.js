/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * utils.js
 * ==========================================================
 */

class Utils {

    /**
     * ======================================================
     * QUERY
     * ======================================================
     */

    static $(selector, parent = document){

        return parent.querySelector(selector);

    }

    static $$(selector, parent = document){

        return [...parent.querySelectorAll(selector)];

    }

    /**
     * ======================================================
     * CREATE ELEMENT
     * ======================================================
     */

    static create(tag, className = "", html = ""){

        const el = document.createElement(tag);

        if(className){

            el.className = className;

        }

        if(html){

            el.innerHTML = html;

        }

        return el;

    }

    /**
     * ======================================================
     * EVENT
     * ======================================================
     */

    static on(element, event, callback){

        if(element){

            element.addEventListener(event, callback);

        }

    }

    static off(element, event, callback){

        if(element){

            element.removeEventListener(event, callback);

        }

    }

    /**
     * ======================================================
     * SHOW / HIDE
     * ======================================================
     */

    static show(element){

        if(element){

            element.style.display = "";

        }

    }

    static hide(element){

        if(element){

            element.style.display = "none";

        }

    }

    static toggle(element){

        if(!element)
            return;

        element.style.display =

            getComputedStyle(element).display === "none"

            ? ""

            : "none";

    }

    /**
     * ======================================================
     * CLASS
     * ======================================================
     */

    static addClass(element, className){

        element?.classList.add(className);

    }

    static removeClass(element, className){

        element?.classList.remove(className);

    }

    static toggleClass(element, className){

        element?.classList.toggle(className);

    }

    static hasClass(element, className){

        return element?.classList.contains(className);

    }

    /**
     * ======================================================
     * TEXT
     * ======================================================
     */

    static text(element, value){

        if(element){

            element.textContent = value;

        }

    }

    static html(element, value){

        if(element){

            element.innerHTML = value;

        }

    }

    /**
     * ======================================================
     * VALUE
     * ======================================================
     */

    static value(selector){

        const el =

            typeof selector === "string"

            ? this.$(selector)

            : selector;

        return el?.value ?? "";

    }

    /**
     * ======================================================
     * RANDOM
     * ======================================================
     */

    static random(min, max){

        return Math.floor(

            Math.random() *

            (max - min + 1)

        ) + min;

    }

    static randomItem(array){

        return array[

            this.random(

                0,

                array.length - 1

            )

        ];

    }

    /**
     * ======================================================
     * SHUFFLE
     * ======================================================
     */

    static shuffle(array){

        const arr = [...array];

        for(

            let i = arr.length - 1;

            i > 0;

            i--

        ){

            const j =

                Math.floor(

                    Math.random() * (i + 1)

                );

            [arr[i], arr[j]] =

            [arr[j], arr[i]];

        }

        return arr;

    }

    /**
     * ======================================================
     * DEBOUNCE
     * ======================================================
     */

    static debounce(fn, delay = 300){

        let timer;

        return (...args)=>{

            clearTimeout(timer);

            timer = setTimeout(

                ()=>fn(...args),

                delay

            );

        };

    }

    /**
     * ======================================================
     * THROTTLE
     * ======================================================
     */

    static throttle(fn, delay = 200){

        let waiting = false;

        return (...args)=>{

            if(waiting)
                return;

            waiting = true;

            fn(...args);

            setTimeout(()=>{

                waiting = false;

            }, delay);

        };

    }

    /**
     * ======================================================
     * CLONE
     * ======================================================
     */

    static clone(obj){

        return structuredClone(obj);

    }

    /**
     * ======================================================
     * FORMAT DATE
     * ======================================================
     */

    static formatDate(date = new Date()){

        return new Intl.DateTimeFormat(

            "vi-VN",

            {

                day:"2-digit",

                month:"2-digit",

                year:"numeric"

            }

        ).format(date);

    }

    /**
     * ======================================================
     * UUID
     * ======================================================
     */

    static uuid(){

        return crypto.randomUUID();

    }

    /**
     * ======================================================
     * SCROLL
     * ======================================================
     */

    static scrollTop(){

        window.scrollTo({

            top:0,

            behavior:"smooth"

        });

    }

    /**
     * ======================================================
     * SLEEP
     * ======================================================
     */

    static sleep(ms){

        return new Promise(

            resolve=>setTimeout(resolve, ms)

        );

    }

    /**
     * ======================================================
     * ESCAPE HTML
     * ======================================================
     */

    static escape(text){

        const div = document.createElement("div");

        div.textContent = text;

        return div.innerHTML;

    }

}

export default Utils;