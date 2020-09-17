const accessToken = localStorage.getItem("accessToken");
console.log(accessToken);

const Webex = require('webex');

let webex = Webex.init({
    credentials: {
        access_token: accessToken
    }
});

// There's a few different events that'll let us know we should initialize
// Webex and start listening for incoming calls, so we'll wrap a few things
// up in a function.
function connect() {
    return new Promise((resolve) => {
        if (!webex) {
            // eslint-disable-next-line no-multi-assign
            webex = window.webex = Webex.init({
                config: {
                    meetings: {
                        deviceType: 'WEB'
                    }
                    // Any other sdk config we need
                },
                credentials: {
                    access_token: accessToken
                }
            });
        }

        // Listen for added meetings
        webex.meetings.on('meeting:added', (addedMeetingEvent) => {
            if (addedMeetingEvent.type === 'INCOMING') {
                const addedMeeting = addedMeetingEvent.meeting;

                // Acknowledge to the server that we received the call on our device
                addedMeeting.acknowledge(addedMeetingEvent.type)
                    .then(() => {
                        if (confirm('Answer incoming call')) {
                            joinMeeting(addedMeeting);
                            bindMeetingEvents(addedMeeting);
                        } else {
                            addedMeeting.decline();
                        }
                    });
            }
        });

        // Register our device with Webex cloud
        if (!webex.meetings.registered) {
            webex.meetings.register()
                // Sync our meetings with existing meetings on the server
                .then(() => webex.meetings.syncMeetings())
                .then(() => {
                    // This is just a little helper for our selenium tests and doesn't
                    // really matter for the example
                    document.body.classList.add('listening');
                    document.getElementById('connection-status').innerHTML = 'connected';
                    // Our device is now connected
                    resolve();
                })
                // This is a terrible way to handle errors, but anything more specific is
                // going to depend a lot on your app
                .catch((err) => {
                    console.error(err);
                    // we'll rethrow here since we didn't really *handle* the error, we just
                    // reported it
                    throw err;
                });
        } else {
            // Device was already connected
            resolve();
        }
    });
}

// Similarly, there are a few different ways we'll get a meeting Object, so let's
// put meeting handling inside its own function.
function bindMeetingEvents(meeting) {
    console.log("bind meeting called")
    // call is a call instance, not a promise, so to know if things break,
    // we'll need to listen for the error event. Again, this is a rather naive
    // handler.
    meeting.on('error', (err) => {
        console.error(err);
    });

    // Handle media streams changes to ready state
    meeting.on('media:ready', (media) => {
        if (!media) {
            return;
        }

        if (media.type === 'local') {
            document.getElementById('self-view').srcObject = media.stream;
        }
        if (media.type === 'remoteVideo') {
            document.getElementById('remote-view-video').srcObject = media.stream;
        }
        if (media.type === 'remoteAudio') {
            document.getElementById('remote-view-audio').srcObject = media.stream;
        }
    });

    // Handle media streams stopping
    meeting.on('media:stopped', (media) => {
        // Remove media streams
        if (media.type === 'local') {
            document.getElementById('self-view').srcObject = null;
        }
        if (media.type === 'remoteVideo') {
            document.getElementById('remote-view-video').srcObject = null;
        }
        if (media.type === 'remoteAudio') {
            document.getElementById('remote-view-audio').srcObject = null;
        }
    });

    // Update participant info
    meeting.members.on('members:update', (delta) => {
        const {full: membersData} = delta;
        const memberIDs = Object.keys(membersData);

        memberIDs.forEach((memberID) => {
            const memberObject = membersData[memberID];

            // Devices are listed in the memberships object.
            // We are not concerned with them in this demo
            if (memberObject.isUser) {
                if (memberObject.isSelf) {
                    document.getElementById('call-status-local').innerHTML = memberObject.status;
                } else {
                    document.getElementById('call-status-remote').innerHTML = memberObject.status;
                }
            }
        });
    });

    document.getElementById('join').addEventListener('click', () => {
        dial();
    });

    // Of course, we'd also like to be able to end the call:
    document.getElementById('hangup').addEventListener('click', () => {
        meeting.leave();
    });
}

connect();

// Join the meeting and add media
function joinMeeting(meeting) {
    // Get constraints
    const constraints = {
        audio: document.getElementById('constraints-audio').checked,
        video: document.getElementById('constraints-video').checked
    };

    return meeting.join().then(() => {
        const mediaSettings = {
            receiveVideo: constraints.video,
            receiveAudio: constraints.audio,
            receiveShare: false,
            sendVideo: constraints.video,
            sendAudio: false,
            sendShare: false
        };

        return meeting.getMediaStreams(mediaSettings).then((mediaStreams) => {
            const [localStream, localShare] = mediaStreams;

            meeting.addMedia({
                localShare,
                localStream,
                mediaSettings
            });
        });
    });
}
// And finally, let's wire up dialing
dial();

function dial() {
    const destination = localStorage.getItem("meeting_uri");

    // we'll use `connect()` (even though we might already be connected or
    // connecting) to make sure we've got a functional webex instance.
    connect()
        .then(() => {
            // Create the meeting
            return webex.meetings.create(destination).then((meeting) => {
                // Call our helper function for binding events to meetings
                bindMeetingEvents(meeting);

                return joinMeeting(meeting);
            });
        })
        .catch((error) => {
            // Report the error
            console.error(error);

            // Implement error handling here
        });
}

async function runFaceRec() {
    // load face detection and face expression recognition models
    await faceapi.loadFaceExpressionModel('/models')
    // await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
}

const SSD_MOBILENETV1 = 'ssd_mobilenetv1'
const TINY_FACE_DETECTOR = 'tiny_face_detector'

let selectedFaceDetector = TINY_FACE_DETECTOR

// ssd_mobilenetv1 options
let minConfidence = 0.5

// tiny_face_detector options
let inputSize = 512
let scoreThreshold = 0.5

function getFaceDetectorOptions() {
    return selectedFaceDetector === SSD_MOBILENETV1
        ? new faceapi.SsdMobilenetv1Options({minConfidence})
        : new faceapi.TinyFaceDetectorOptions({inputSize, scoreThreshold})
}

let counter = 0
let happyStreak = false

async function onPlayAll() {
    async function onPlay(view, overlay) {
        let withBoxes = true

        const videoEl = document.getElementById(view);

        if (videoEl.paused || videoEl.ended)
            return setTimeout(() => onPlay(view, overlay))

        const options = getFaceDetectorOptions()

        const ts = Date.now()

        const result = await faceapi.detectSingleFace(videoEl, options).withFaceExpressions()

        if (result) {
            const canvas = document.getElementById(overlay);
            const dims = faceapi.matchDimensions(canvas, videoEl, true)

            const resizedResult = faceapi.resizeResults(result, dims)
            const minConfidence = 0.05
            if (withBoxes) {
                faceapi.draw.drawDetections(canvas, resizedResult)
            }
            faceapi.draw.drawFaceExpressions(canvas, resizedResult, minConfidence)
        }

        if (!(result === undefined)) {
            if (happyStreak === false && result.expressions != null && Object.values(result.expressions)[1] > 0.8) {
                happyStreak = true;
                counter++;
                document.getElementById('call-funds-raised').innerHTML = counter;
            } else {
                happyStreak = false;
            }
        }

        setTimeout(() => onPlay(view, overlay))
    }


    [
        {view: "remote-view-video", overlay: "remote-face-rec-overlay"},
        {view: "self-view", overlay: "self-face-rec-overlay"}
    ].forEach((participant) => {
        onPlay(participant.view, participant.overlay);
    });
}

document.getElementById('enablefacerec').addEventListener('click', () => {
    runFaceRec().then(() => {
        console.log("Face Rec models loaded\n");
        onPlayAll();
    }).catch(function (error) {
        console.log("Error loading Face Rec models\n");
        console.error(error.message);
    });
});

document.getElementById('extractlocalframe').addEventListener('click', () => {
    extractAndDownloadFrame('self-view', 'local-frame')
});

document.getElementById('extractremoteframe').addEventListener('click', () => {
    extractAndDownloadFrame('remote-view-video', 'remote-frame')
});

function extractAndDownloadFrame(videoId, filename) {
    var video = document.getElementById(videoId);
    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    var context = canvas.getContext("2d");
    context.drawImage(video, 0, 0);
    var img = canvas.toDataURL("image/jpeg", 1.0);
    downloadImage(img, filename + '.jpeg');
}

function downloadImage(data, filename) {
    var a = document.createElement('a');
    a.href = data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
}

/* Our Code */

document.getElementById('room-create').addEventListener('click', async () => {
    const room = await setUpNewRoom();
    console.log(room);
    const meeting = await createMeeting(room.id);
    console.log(meeting);
    const roomStuff = Object.values(room);
    console.log(roomStuff);
    const creatorId = roomStuff[5];
    console.log(creatorId);
});

async function setUpNewRoom() {
    return webex.rooms.create({title: 'First Comedy Room'})
        .then(function (room) {
            var assert = require('assert');
            assert(typeof room.created === 'string');
            assert(typeof room.id === 'string');
            return room
        })
}

function createMeeting(roomId) {
    return webex.meetings.create(roomId);
}


