import ConnectionMap from "../connectionMap.js";

export default class ConnectionLab {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component guided-practice-component";

        component.innerHTML = `
            <div class="component-header">
                ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                <p class="question-text">${data.instruction || step.instruction || ""}</p>
            </div>
        `;
        const mapEl = ConnectionMap.render(data.connectionData);
        component.appendChild(mapEl);
        
        const btnContainer = document.createElement("div");
        btnContainer.style.cssText = "text-align: center; margin-top: 30px;";
        btnContainer.innerHTML = `<button class="btn btn-primary" onclick="window.engine && window.engine.next()">Tiếp tục</button>`;
        component.appendChild(btnContainer);
        
        return component;
    }
}
