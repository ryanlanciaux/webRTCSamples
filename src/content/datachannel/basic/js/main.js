/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

("use strict");

function logUpdate(logItem) {
  log = document.querySelector("#log");
  log.innerHTML = logItem;
}

let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
const dataChannelSend = document.querySelector("textarea#dataChannelSend");
const dataChannelReceive = document.querySelector(
  "textarea#dataChannelReceive"
);
const startButton = document.querySelector("button#startButton");
const sendButton = document.querySelector("button#sendButton");
const closeButton = document.querySelector("button#closeButton");

startButton.onclick = createConnection;
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;

var selected = closeButton;
selected.focus();

// TODO: There are a way better ways to do this.
// just for quickly testing using this big, nested if :D
function someKeydownHandler(e) {
  const isPrevious =
    e.key === "ArrowLeft" ||
    e.key === "ArrowTop" ||
    e.keyCode === 37 ||
    e.keyCode === 38;
  const isNext =
    e.key === "ArrowRight" ||
    (e.key === "ArrowDown") | (e.keyCode === 39) ||
    e.keyCode === 40;

  const isEnter = e.key === "Enter" || e.keyCode === 13;

  if (isNext) {
    if (selected === startButton) {
      selected = sendButton;
    } else if (selected === sendButton) {
      selected = closeButton;
    } else if (selected === closeButton) {
      selected = startButton;
    }
  }
  if (isPrevious) {
    if (selected === startButton) {
      selected = closeButton;
    } else if (selected === sendButton) {
      selected = startButton;
    } else if (selected === closeButton) {
      selected = sendButton;
    }
  }

  selected.focus();

  if (isEnter) {
    selected.click();
  }
}

function enableStartButton() {
  startButton.disabled = false;
}

function disableSendButton() {
  sendButton.disabled = true;
}

function createConnection() {
  dataChannelSend.placeholder = "";
  const servers = null;
  window.localConnection = localConnection = new RTCPeerConnection(servers);
  logUpdate("Created local peer connection object localConnection");

  logUpdate("About to create dataChannel");
  sendChannel = localConnection.createDataChannel("sendDataChannel");
  logUpdate("Created send data channel");

  localConnection.onicecandidate = e => {
    onIceCandidate(localConnection, e);
  };
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;

  window.remoteConnection = remoteConnection = new RTCPeerConnection(servers);
  logUpdate("Created remote peer connection object remoteConnection");

  remoteConnection.onicecandidate = e => {
    onIceCandidate(remoteConnection, e);
  };
  remoteConnection.ondatachannel = receiveChannelCallback;

  localConnection
    .createOffer()
    .then(gotDescription1, onCreateSessionDescriptionError);
  startButton.disabled = true;
  closeButton.disabled = false;
}

function onCreateSessionDescriptionError(error) {
  logUpdate("Failed to create session description: " + error.toString());
}

function sendData() {
  const data = dataChannelSend.value;
  sendChannel.send(data);
  logUpdate("Sent Data: " + data);
}

function closeDataChannels() {
  logUpdate("Closing data channels");
  sendChannel.close();
  logUpdate("Closed data channel with label: " + sendChannel.label);
  receiveChannel.close();
  logUpdate("Closed data channel with label: " + receiveChannel.label);
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  logUpdate("Closed peer connections");
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = "";
  dataChannelReceive.value = "";
  dataChannelSend.disabled = true;
  disableSendButton();
  enableStartButton();
}

function gotDescription1(desc) {
  localConnection.setLocalDescription(desc);
  logUpdate(`Offer from localConnection\n${desc.sdp}`);
  remoteConnection.setRemoteDescription(desc);
  remoteConnection
    .createAnswer()
    .then(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  logUpdate(`Answer from remoteConnection\n${desc.sdp}`);
  localConnection.setRemoteDescription(desc);
}

function getOtherPc(pc) {
  return pc === localConnection ? remoteConnection : localConnection;
}

function getName(pc) {
  return pc === localConnection
    ? "localPeerConnection"
    : "remotePeerConnection";
}

function onIceCandidate(pc, event) {
  getOtherPc(pc)
    .addIceCandidate(event.candidate)
    .then(
      () => onAddIceCandidateSuccess(pc),
      err => onAddIceCandidateError(pc, err)
    );
  logUpdate(
    `${getName(pc)} ICE candidate: ${
      event.candidate ? event.candidate.candidate : "(null)"
    }`
  );
}

function onAddIceCandidateSuccess() {
  logUpdate("AddIceCandidate success.");
}

function onAddIceCandidateError(error) {
  logUpdate(`Failed to add Ice Candidate: ${error.toString()}`);
}

function receiveChannelCallback(event) {
  logUpdate("Receive Channel Callback");
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(event) {
  logUpdate("Received Message");
  dataChannelReceive.value = event.data;
}

function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  logUpdate("Send channel state is: " + readyState);
  if (readyState === "open") {
    dataChannelSend.disabled = false;
    sendButton.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function onReceiveChannelStateChange() {
  const readyState = receiveChannel.readyState;
  logUpdate(`Receive channel state is: ${readyState}`);
}
