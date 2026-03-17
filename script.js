var equations = {
    1: "",
};

var activeIndex = null;
let removedId = NaN;

var keyState = {
    enterPressed: false,
    backspacePressed: false
};

var bounds = {
    leftX: -10,
    rightX: 10,
    leftY: -10,
    rightY: 10
}

var drag = {
    active: false,
    lastX: 0,
    lastY: 0
};

const scrollStep = 10;
const canvasStep = 1;

const MQ = MathQuill.getInterface(2);
var mqFields = {};

const equationsHolder = document.getElementsByClassName("equationsHolder")[0]

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function makeMQHandlers(getIdx) {
    return {
        enter: () => { keyState.enterPressed = true; },
        deleteOutOf: () => { keyState.backspacePressed = true; },
        upOutOf: () => { navigateEquation(-1); },
        downOutOf: () => { navigateEquation(1); }
    };
}

function navigateEquation(direction) {
    let idx = getActiveIndex();
    if (isNaN(idx)) return;

    let next = direction === -1
        ? Math.max(idx - 1, 1)
        : Math.min(idx + 1, Object.keys(equations).length);

    if (next === idx) return;

    let currentTop = parseInt(equationsHolder.style.top) || 0;
    let equationTop = (next - 1) * 10;
    let visibleTop = -currentTop;
    let visibleBottom = visibleTop + 100;

    if (equationTop < visibleTop)
        equationsHolder.style.top = (currentTop + scrollStep) + "%";
    else if (equationTop + scrollStep > visibleBottom)
        equationsHolder.style.top = (currentTop - scrollStep) + "%";

    if (mqFields[next]) mqFields[next].focus();
}

mqFields[1] = MQ.MathField(document.getElementById("input1"), {
    handlers: makeMQHandlers(() => 1)
});

document.addEventListener("keydown", function(event) {
    if (!isNaN(activeIndex)) {
        if (event.key === "Enter")
            keyState.enterPressed = true;
        else if (event.key === "Backspace") {
            let currentInput = document.getElementById("input" + activeIndex);

            if (currentInput && currentInput.value.length === 0)
                keyState.backspacePressed = true;
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            activeIndex = (event.key === "ArrowUp") ? Math.max(activeIndex - 1, 1) : Math.min(activeIndex + 1, Object.keys(equations).length);

            let currentTop = parseInt(equationsHolder.style.top) || 0;
            let equationTop = (activeIndex - 1) * 10;
            let visibleTop = -currentTop;
            let visibleBottom = visibleTop + 100;

            if (equationTop < visibleTop)
                equationsHolder.style.top = (currentTop + scrollStep) + "%";
            else if (equationTop + scrollStep > visibleBottom)
                equationsHolder.style.top = (currentTop - scrollStep) + "%";

            let newInput = document.getElementById("input" + activeIndex);
            if (newInput) newInput.focus({ preventScroll: true });
        }
    }
});

equationsHolder.addEventListener("wheel", (event) => {
    let currentTop = parseInt(equationsHolder.style.top) || 0;
    let totalEquations = Object.keys(equations).length;
    
    let maxScrollUp = (totalEquations * 10) - 100;

    if (event.deltaY > 0) {
        if (totalEquations > 10 && Math.abs(currentTop) < maxScrollUp)
            equationsHolder.style.top = (currentTop - scrollStep) + "%";
    } else if (event.deltaY < 0) {
        if (currentTop < 0)
            equationsHolder.style.top = (currentTop + scrollStep) + "%";
    }
});

canvas.addEventListener("mousedown", (event) => {
    drag.active = true;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    canvas.style.cursor = "grabbing";
});

canvas.addEventListener("mousemove", (event) => {
    if (!drag.active) return;

    let boundsWidth = bounds.rightX - bounds.leftX;
    let boundsHeight = bounds.rightY - bounds.leftY;

    let dx = ((event.clientX - drag.lastX) / canvas.width) * boundsWidth;
    let dy = ((event.clientY - drag.lastY) / canvas.height) * boundsHeight;

    bounds.leftX  -= dx;
    bounds.rightX -= dx;
    bounds.leftY  += dy;
    bounds.rightY += dy;

    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
});

canvas.addEventListener("mouseup", () => {
    drag.active = false;
    canvas.style.cursor = "default";
});

canvas.addEventListener("mouseleave", () => {
    drag.active = false;
    canvas.style.cursor = "default";
});

canvas.addEventListener("wheel", (event) => {
    event.preventDefault();

    let boundsWidth = bounds.rightX - bounds.leftX;
    let boundsHeight = bounds.rightY - bounds.leftY;

    let rect = canvas.getBoundingClientRect();
    let mouseX = bounds.leftX + ((event.clientX - rect.left) / canvas.width) * boundsWidth;
    let mouseY = bounds.leftY + ((canvas.height - (event.clientY - rect.top)) / canvas.height) * boundsHeight;

    let zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;

    bounds.leftX  = mouseX + (bounds.leftX  - mouseX) * zoomFactor;
    bounds.rightX = mouseX + (bounds.rightX - mouseX) * zoomFactor;
    bounds.leftY  = mouseY + (bounds.leftY  - mouseY) * zoomFactor;
    bounds.rightY = mouseY + (bounds.rightY - mouseY) * zoomFactor;

}, { passive: false });

function niceStep(range, targetDivisions) {
    let rough = range / targetDivisions;
    let mag = Math.pow(10, Math.floor(Math.log10(rough)));
    let norm = rough / mag;
    let nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
    return nice * mag;
}

function shiftDown(index) {
    if (index > Object.keys(equations).length) return;

    let element = document.getElementById(index);
    element.style.top = parseInt(element.style.top.replace("%", "")) + 10 + "%";
    element.id = (index + 1) + "";

    let mqSpan = document.getElementById("input" + index);
    mqSpan.id = "input" + (index + 1);
    mqFields[index + 1] = mqFields[index];
    delete mqFields[index];

    element.children[0].children[0].textContent = (index + 1);

    return shiftDown(index + 1);
}

function addEquation() {
    var newEquation = document.createElement("div");
    newEquation.classList = ["equations"];
    newEquation.id = (activeIndex + 1) + "";
    newEquation.style.top = (10 * activeIndex) + "%";

    var newNumberedHolder = document.createElement("div");
    newNumberedHolder.classList = ["numberedHolder"];

    var newNumbered = document.createElement("h1");
    newNumbered.classList = ["numbered"];
    newNumbered.textContent = newEquation.id;

    var newMQSpan = document.createElement("span");
    newMQSpan.classList = ["equationsText"];
    newMQSpan.id = "input" + newEquation.id;

    newNumberedHolder.appendChild(newNumbered);
    newEquation.append(newNumberedHolder);
    newEquation.appendChild(newMQSpan);
    document.getElementsByClassName("equationsHolder")[0].appendChild(newEquation);

    let newIndex = parseInt(newEquation.id);
    mqFields[newIndex] = MQ.MathField(newMQSpan, {
        handlers: makeMQHandlers(() => newIndex)
    });
}

function shiftUp(stopIndex, index) {
    if (index <= stopIndex) return;

    let element = document.getElementById(index);
    element.style.top = parseInt(element.style.top.replace("%", "")) - 10 + "%";
    element.id = (index - 1) + "";

    let mqSpan = document.getElementById("input" + index);
    mqSpan.id = "input" + (index - 1);
    mqFields[index - 1] = mqFields[index];
    delete mqFields[index];

    element.children[0].children[0].textContent = (index - 1);

    return shiftUp(stopIndex, index - 1);
}

function checkEquations() {
    let equationsElement = document.getElementsByClassName("equations");
    var newEquations = {};

    Array.prototype.map.call(equationsElement, function(element) {
        let index = parseInt(element.id);
        if (removedId != index) {
            newEquations[index] = mqFields[index] ? mqFields[index].latex() : "";
        }
    });

    equations = Object.entries(newEquations).sort((a, b) => a[0] - b[0]);
}

function getActiveIndex() {
    let el = document.activeElement;
    let equationDiv = el ? el.closest('.equations') : null;
    if (!equationDiv) return NaN;
    return parseInt(equationDiv.id);
}

function addingEquations(activeIndex) {
    if (keyState.enterPressed) {
        if (activeIndex != Object.keys(equations).length)
            shiftDown(activeIndex + 1);

        addEquation();

        let nextIndex = activeIndex + 1;
        let currentTop = parseInt(equationsHolder.style.top) || 0;
        let equationTop = (nextIndex - 1) * 10;
        let visibleBottom = -currentTop + 100;

        if (equationTop + scrollStep > visibleBottom)
            equationsHolder.style.top = (currentTop - scrollStep) + "%";

        if (mqFields[nextIndex]) mqFields[nextIndex].focus();

        keyState.enterPressed = false;
    }
}

function removingEquations(activeIndex, currentInput) {
    if (keyState.backspacePressed) {
        if (Object.keys(equations).length > 1) {
            if (!Number.isNaN(activeIndex)) {
                removedId = NaN;

                if (activeIndex != Object.keys(equations).length)
                    shiftUp(activeIndex, Object.keys(equations).length);

                document.getElementById(activeIndex).remove();
                delete mqFields[activeIndex];

                let prevIndex = Math.max(1, activeIndex - 1);
                let currentTop = parseInt(equationsHolder.style.top) || 0;
                let equationTop = (prevIndex - 1) * 10;
                let visibleTop = -currentTop;

                if (equationTop < visibleTop)
                    equationsHolder.style.top = (currentTop + scrollStep) + "%";

                let remainingCount = Object.keys(equations).length - 1;
                let maxScrollDown = Math.max(0, remainingCount * scrollStep - 100);
                if (Math.abs(currentTop) > maxScrollDown)
                    equationsHolder.style.top = -maxScrollDown + "%";

                if (mqFields[prevIndex]) mqFields[prevIndex].focus();
            }
        }
        keyState.backspacePressed = false;
    }
}

function update() {
    checkEquations();
    activeIndex = getActiveIndex();

    if (isNaN(activeIndex)) return;

    let currentInput = document.getElementById("input" + activeIndex);
    if (!currentInput) return;

    addingEquations(activeIndex);
    removingEquations(activeIndex, currentInput);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let boundsWidth = bounds.rightX - bounds.leftX;
    let boundsHeight = bounds.rightY - bounds.leftY;
    let incrementX = canvas.width / boundsWidth;
    let incrementY = canvas.height / boundsHeight;

    let toScreenX = x => (x - bounds.leftX) * incrementX;
    let toScreenY = y => canvas.height - (y - bounds.leftY) * incrementY;

    let originX = toScreenX(0);
    let originY = toScreenY(0);

    let majorStep = niceStep(boundsWidth, 8);
    let minorStep = majorStep / 5;

    ctx.beginPath();

    ctx.strokeStyle = "#969696";
    ctx.lineWidth = 0.25;

    let startX = Math.ceil(bounds.leftX / minorStep) * minorStep;

    for (let x = startX; x <= bounds.rightX; x += minorStep) {
        if (Math.abs(x % majorStep) < minorStep * 0.01) continue;
        let sx = toScreenX(x);
        ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height);
    }

    let startY = Math.ceil(bounds.leftY / minorStep) * minorStep;

    for (let y = startY; y <= bounds.rightY; y += minorStep) {
        if (Math.abs(y % majorStep) < minorStep * 0.01) continue;
        let sy = toScreenY(y);
        ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy);
    }

    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#414141";
    ctx.lineWidth = 0.5;

    let majorStartX = Math.ceil(bounds.leftX / majorStep) * majorStep;

    for (let x = majorStartX; x <= bounds.rightX; x += majorStep) {
        let sx = toScreenX(x);
        ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height);
    }

    let majorStartY = Math.ceil(bounds.leftY / majorStep) * majorStep;

    for (let y = majorStartY; y <= bounds.rightY; y += majorStep) {
        let sy = toScreenY(y);
        ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.moveTo(0, originY); ctx.lineTo(canvas.width, originY);
    ctx.moveTo(originX, 0); ctx.lineTo(originX, canvas.height);
    ctx.stroke();

    ctx.fillStyle = "#444";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let x = majorStartX; x <= bounds.rightX; x += majorStep) {
        if (Math.abs(x) < majorStep * 0.01) continue;
        ctx.fillText(parseFloat(x.toPrecision(10)), toScreenX(x), originY + 4);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let y = majorStartY; y <= bounds.rightY; y += majorStep) {
        if (Math.abs(y) < majorStep * 0.01) continue;
        ctx.fillText(parseFloat(y.toPrecision(10)), originX - 4, toScreenY(y));
    }

    Object.entries(equations).forEach(([index, section]) => {
        let mathString = section[1];
        if (!mathString || mathString.length === 0) return;

        let expr = mathString
            .replace(/\\cdot/g, '*')
            .replace(/\^{([^}]+)}/g, '^($1)')
            .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1)/($2)')
            .replace(/\\left|\\right/g, '')
            .replace(/[{}]/g, '');

        if (expr.startsWith("y=")) {
            let equation = expr.replace("y=", "");
            if (equation.length === 0) return;

            try {
                let expression = math.compile(equation);
                ctx.beginPath();
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 2;
                let started = false;

                for (let x = bounds.leftX; x <= bounds.rightX; x += boundsWidth / canvas.width) {
                    let y = expression.evaluate({ x });
                    if (!isFinite(y)) { started = false; continue; }
                    if (!started) { ctx.moveTo(toScreenX(x), toScreenY(y)); started = true; }
                    else ctx.lineTo(toScreenX(x), toScreenY(y));
                }
                ctx.stroke();
            } catch (e) {}
        }
    });
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

gameLoop();
