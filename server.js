const port = 80
const http = require('http')
const express = require('express')
const websocket = require('ws')
const path = require('path')
const app = express()
const server = http.createServer(app)
const wss = new websocket.Server({server})

const request = require('request')

const media1URL = 'http://192.168.100.33:8080/video/mjpeg'
const media2URL = 'http://192.168.100.23:8080/video/mjpeg'
const mjpegDecoder = require('mjpeg-decoder')
const base64ArrayBuffer = require('base64-arraybuffer')

const fs = require('fs')

require('@tensorflow/tfjs-node')
const faceapi = require('face-api.js')
const { Canvas, Image, ImageData, loadImage } = require('canvas')
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
const FaceMatcher = require('./FaceMatcher.js')(faceapi)

initializeFaceDetector()

app.use(express.static(path.join(__dirname, 'js')))

const viewsDir = path.join(__dirname, './views')
app.get('/', (req, res) => res.sendFile(path.join(viewsDir, 'index.html')))

app.get('/media1', function(req, res) { 
    request(media1URL).pipe(res)
})

app.get('/media2', function(req, res) {  
    request(media2URL).pipe(res)
})

wss.on('connection', function connection(ws, request, client) {
    let names = []
    for (let i = 0; i < occupants.length; i++) 
        names.push(occupants[i].name)
    let networkJSON = JSON.stringify({
        action: 0,
        names: names
    })
    ws.send(networkJSON)
})

server.listen(port, () => console.log(`Listening on port ${port}`))

const occupants = []

async function initializeFaceDetector() {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models')
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./models')
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./models')

    await loadFacesFromDisk()

    setInterval(() => {
        detectFaces(1)
        detectFaces(2)
    }, 500)
}

async function loadFacesFromDisk() {
    let names = fs.readdirSync('./images')
    for (const index in names) {
        const name = names[index]
        const descriptors = []
        let pictures = Object.values(fs.readdirSync(`./images/${name}`))
        for (const index in pictures) {
            const picture = pictures[index]
            const image = await loadImage(`./images/${name}/${picture}`)
            const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor()
            descriptors.push(detection.descriptor)
        }
        FaceMatcher.addFaceDescription({
            label: { name: name },
            descriptors: descriptors
        })
    }
}

async function detectFaces(mediaIndex){
    const decoder = mjpegDecoder.decoderForSnapshot(mediaIndex == 1 ? media1URL : media2URL)
    const buffer = await decoder.takeSnapshot()
    const image = await bufferToImage(buffer)
    let faces = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors()
    faces = faces.filter((face) => {
        const box = face.detection._box
        return box._width > 60 && box._height > 60
    })
    const networkObject = new Object()
    networkObject.action = mediaIndex
    networkObject.faces = []
    for (const index in faces) {
        const face = faces[index]
        const label = FaceMatcher.findBestMatch(face.descriptor)
        updateOccupants(mediaIndex, label)
        networkObject.faces.push({
            name: label.name,
            box: face.detection._box
        })
    }
    let networkJSON = JSON.stringify(networkObject)
    wss.clients.forEach(function (client) {
        client.send(networkJSON)
    })
}

async function bufferToImage(buffer) {
	return new Promise((resolve, reject) => {
        const base64 = base64ArrayBuffer.encode(buffer)
        const media = new Image()
        media.onload = () => {
            resolve(media)
        }
        media.onerror = err => { reject }
        media.src = `data:image/jpg;base64,${base64}`
	})
}

function updateOccupants(media, label) {
    let index = occupants.indexOf(label)
    if (media == 1) {
        if (index == -1) {
            occupants.push(label)
            updateNetworkOccupant(3, label.name)
        }
    } else {
        if (index != -1) {
            occupants.splice(index, 1)
            updateNetworkOccupant(4, label.name)
        }
    }
}

function updateNetworkOccupant(action, name) {
    let networkJSON = JSON.stringify({
        action: action,
        name: name
    })
    wss.clients.forEach(function (client) {
        client.send(networkJSON)
    })
}

