let faceapi
let FaceDescriptions = []
let unknownCounter = 0

function FaceMatcher(_faceapi) {
    faceapi = _faceapi
    return FaceMatcher.prototype
}

FaceMatcher.prototype.addFaceDescription = function(faceDescription) {
    FaceDescriptions.push(faceDescription)
}

function computeMeanDistance(queryDescriptor, descriptors) {
    return descriptors.map(d => faceapi.euclideanDistance(d, queryDescriptor))
        .reduce((d1, d2) => d1 + d2, 0) / (descriptors.length || 1)
}

function matchDescriptor(queryDescriptor) {
    if(FaceDescriptions.length == 0) return
    return FaceDescriptions.map((faceDescription) => {
        faceDescription.distance = computeMeanDistance(queryDescriptor, faceDescription.descriptors)
        return faceDescription
    }).reduce((best, curr) => best.distance < curr.distance ? best : curr)
}

FaceMatcher.prototype.findBestMatch = function (queryDescriptor) {
    const faceDescription = matchDescriptor(queryDescriptor)
    if (faceDescription && faceDescription.distance < 0.65) {
        if (faceDescription.descriptors.length < 3 && faceDescription.distance > 0.45 && faceDescription.distance < 0.5) {
            //console.log(`${faceDescription.label.name} updated`)
            faceDescription.descriptors.push(queryDescriptor)
        }
        return faceDescription.label
    } else {
        //if (faceDescription) console.log(`${faceDescription.label.name} ${faceDescription.distance}`)
        const newFaceDescription = {
            label: { name: `unknown ${++unknownCounter}` },
            descriptors: [queryDescriptor]
        }
        FaceDescriptions.push(newFaceDescription)
        return newFaceDescription.label
    }
}

module.exports = FaceMatcher