const media1 = document.getElementById('media1')
const media2 = document.getElementById('media2')

const canvas1 = document.createElement('CANVAS')
const canvas1Context = canvas1.getContext('2d')
const canvas2 = document.createElement('CANVAS')
const canvas2Context = canvas2.getContext('2d')
let canvasInitialized = false

const fontSize = 10
const labelPadding = 4
const labelOffset = 8

const occupantsCount = document.getElementById('count')
const occupantsList = document.getElementById('list')

initializeCanvas()

async function initializeCanvas() {
    await waitForMedia(media1)
    await waitForMedia(media2)
    positionCanvas(canvas1, media1)
    positionCanvas(canvas2, media2)
    canvasInitialized = true
}

function waitForMedia(media) {
	return new Promise((resolve, reject) => {
        if (media.complete)
            resolve()
        else {
            media.onload = () => { resolve() }
            media.onerror = err => { reject }
        }
	})
}

function positionCanvas(canvas, media) {
    canvas.width = media.clientWidth
    canvas.height = media.clientHeight
    const rect = media.getBoundingClientRect()
    canvas.style.position = 'absolute'
    canvas.style.top = `${rect.top}px`
    canvas.style.left = `${rect.left}px`
    document.body.appendChild(canvas)
}

const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`)

ws.onmessage = function (evt) {
    const networkObject = JSON.parse(evt.data)
    let action = networkObject.action
    if (action == 0) {
        let names = networkObject.names
        occupantsCount.innerHTML = names.length
        for (let i = 0; i < names.length; i++) {
            addOccupant(names[i])
        }
    } else if (action == 1 || action == 2) {
        if (!canvasInitialized) return;
        const canvas = action == 1 ? canvas1 : canvas2
        const canvasContext = action == 1 ? canvas1Context : canvas2Context
        canvasContext.clearRect(0, 0, canvas.width, canvas.height)
        const faces = networkObject.faces;
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i]
            const box = face.box
            drawFrame(box, canvasContext)
            let name = face.name
            name = name.charAt(0).toUpperCase() + name.slice(1)
            drawLabel(name, box, canvasContext)
        }
    } else if (action == 3) {
        addOccupant(networkObject.name)
        let count = occupantsCount.innerHTML
        occupantsCount.innerHTML = ++count
    } else if (action == 4) {
        removeOccupant(networkObject.name)
        let count = occupantsCount.innerHTML
        occupantsCount.innerHTML = --count
    }
}

function addOccupant(name) {
    let listItem = document.createElement("LI")
    listItem.id = name
    listItem.innerText = name
    occupantsList.appendChild(listItem)
}

function removeOccupant(name) {
    let listItem = document.getElementById(name)
    occupantsList.removeChild(listItem)
}

function drawLabel(name, box, canvasContext) {
    canvasContext.fillStyle = "#000000"
    canvasContext.fillRect(box._x - labelPadding,
        box._y - labelOffset - fontSize - labelPadding,
        canvasContext.measureText(name).width + 2 * labelPadding,
        fontSize + 2 * labelPadding)
    canvasContext.font = `${fontSize}px 'Courier New'`
    canvasContext.fillStyle = "#FFFFFF"
    canvasContext.fillText(name, box._x, box._y - labelOffset)
}

function drawFrame(box, canvasContext) {
    canvasContext.lineWidth = 2
    canvasContext.beginPath()
    canvasContext.moveTo(box._x, box._y)

    canvasContext.lineTo(box._x + box._width * 0.1, box._y)
    canvasContext.moveTo(box._x + box._width * 0.9, box._y)
    canvasContext.lineTo(box._x + box._width, box._y)

    canvasContext.lineTo(box._x  + box._width, box._y  + box._height * 0.1)
    canvasContext.moveTo(box._x  + box._width, box._y  + box._height * 0.9)
    canvasContext.lineTo(box._x  + box._width, box._y  + box._height)

    canvasContext.lineTo(box._x  + box._width * 0.9, box._y  + box._height)
    canvasContext.moveTo(box._x  + box._width * 0.1, box._y  + box._height)
    canvasContext.lineTo(box._x, box._y  + box._height)

    canvasContext.lineTo(box._x, box._y  + box._height * 0.9)
    canvasContext.moveTo(box._x, box._y  + box._height * 0.1)
    canvasContext.lineTo(box._x, box._y)
    
    canvasContext.stroke()
} 




