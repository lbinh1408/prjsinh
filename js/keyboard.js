/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * keyboard.js
 * ==========================================================
 */

class Keyboard {

    static enabled = true;

    /**
     * ======================================================
     * INIT
     * ======================================================
     */

    static init(){

        document.addEventListener(

            "keydown",

            this.handle.bind(this)

        );

    }

    /**
     * ======================================================
     * HANDLE
     * ======================================================
     */

    static handle(event){

        if(!this.enabled)
            return;

        const target = event.target.tagName;

        if(

            target === "INPUT" ||

            target === "TEXTAREA"

        ){

            return;

        }

        switch(event.key){

            case "ArrowRight":

                event.preventDefault();

                document

                    .getElementById("btn-next")

                    ?.click();

                break;

            case "ArrowLeft":

                event.preventDefault();

                document

                    .getElementById("btn-prev")

                    ?.click();

                break;

            case "Enter":

                event.preventDefault();

                document

                    .getElementById("btn-check")

                    ?.click();

                break;

            case "h":

            case "H":

                event.preventDefault();

                document

                    .getElementById("btn-hint")

                    ?.click();

                break;

            case "Escape":

                event.preventDefault();

                this.closePopup();

                break;

            case "Home":

                event.preventDefault();

                document

                    .getElementById("btn-home")

                    ?.click();

                break;

        }

    }

    /**
     * ======================================================
     * ENABLE
     * ======================================================
     */

    static enable(){

        this.enabled = true;

    }

    /**
     * ======================================================
     * DISABLE
     * ======================================================
     */

    static disable(){

        this.enabled = false;

    }

    /**
     * ======================================================
     * TOGGLE
     * ======================================================
     */

    static toggle(){

        this.enabled = !this.enabled;

    }

    /**
     * ======================================================
     * CLOSE POPUP
     * ======================================================
     */

    static closePopup(){

        document

            .querySelectorAll(".popup")

            .forEach(

                popup=>popup.remove()

            );

    }

    /**
     * ======================================================
     * SHORTCUTS
     * ======================================================
     */

    static shortcuts(){

        return [

            {

                key:"←",

                action:"Bước trước"

            },

            {

                key:"→",

                action:"Bước tiếp"

            },

            {

                key:"Enter",

                action:"Kiểm tra"

            },

            {

                key:"H",

                action:"Gợi ý"

            },

            {

                key:"Esc",

                action:"Đóng cửa sổ"

            },

            {

                key:"Home",

                action:"Trang chủ"

            }

        ];

    }

}

export default Keyboard;