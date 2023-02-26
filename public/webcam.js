const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true; /* ประกาศตัวแปร */

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
}); /*เพิ่มคำสั่งใน ตัวแปร backBtn เมื่อคลิกให้กำหนด style ในหน้า .main__left ให้ display = flex และกำหนดค่า flex = 1 
และหน้า .main__right และ .header__back ให้ display = none */

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});/*เพิ่มคำสั่งใน ตัวแปร showChat เมื่อคลิกให้กำหนด style ในหน้า .main__right ให้ display = flex และกำหนดค่า flex = 1 
และหน้า .main__left  ให้ display = none และ .header__back ห้ display = block*/


const user =  " <%= name %>"; /*กำหนดตัวแปร user ให้ใส่ชื่อเพื่อเข้าร่วม webcam */

var peer = new Peer({
  host: '127.0.0.1',
  port: 3000,
  path: '/peerjs',
  config: {
    'iceServers': [
      { url: 'stun:stun01.sipphone.com' },
      { url: 'stun:stun.ekiga.net' },
      { url: 'stun:stunserver.org' },
      { url: 'stun:stun.softjoys.com' },
      { url: 'stun:stun.voiparound.com' },
      { url: 'stun:stun.voipbuster.com' },
      { url: 'stun:stun.voipstunt.com' },
      { url: 'stun:stun.voxgratia.org' },
      { url: 'stun:stun.xten.com' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credentials: 'openrelayproject'
      }
      // {
      //   url: 'turn:192.158.29.39:3478?transport=tcp',
      //   credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      //   username: '28224511:1379330808'
      // }
    ]
  },

  debug: 3
});

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      console.log('someone call me');
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

const connectToNewUser = (userId, stream) => {
  console.log('I call someone' + userId);
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
};

peer.on("open", (id) => {
  console.log('my id is' + id);
  socket.emit("join-room", ROOM_ID, id, user);
});

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });
};

let text = document.querySelector("#chat_message");//สร้างตัวแปร text เพื่อเพิ่มช่องแชท
let send = document.getElementById("send"); // สร้างตัวแปร send เพื่อกำหนดปุ่มส่งในช่องแชท
let messages = document.querySelector(".messages"); //สร้างตัวแปร messages และ id messages

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});/*สร้างEventListenerของตัวแปร send เมื่อกดคลิก ถ้าจำนวน text ที่ส่งไปไม่เท่ากับ 0 ให้ส่งข้อความได้ */

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});/*สร้างEventListenerของตัวแปร text เมื่อกดปุ่มในแป้นพิมพ์ ถ้ากดปุ่ม Enter หรือถ้าจำนวน text ที่ส่งไปไม่เท่ากับ 0 ให้ส่งข้อความได้ */

const inviteButton = document.querySelector("#inviteButton"); //ประกาศตัวแปร inviteButton และ id inviteButton
const muteButton = document.querySelector("#muteButton"); //ประกาศตัวแปร muteButton และ id muteButton
const stopVideo = document.querySelector("#stopVideo"); //ประกาศตัวแปร stopVideo และ id stopVideo
muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
}); /* สร้างEventListener ของตัวแปร muteButton เมื่อเริ่มต้นใช้งานให้เปิดเสียงไมโครโฟนและพื้นหลังไอคอนจะเป็นสีฟ้า เมื่อกดคลิกจะปิดไมโครโฟนและพื้นหลังไอคอนจะเป็นสีแดง*/

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});/* สร้างEventListener ของตัวแปร stopVideo เมื่อเริ่มต้นใช้งานให้เปิดกล้องและพื้นหลังไอคอนจะเป็นสีฟ้า เมื่อกดคลิกจะปิดกล้องและพื้นหลังไอคอนจะเป็นสีแดง*/

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});/* สร้างEventListener ของตัวแปร inviteButton เมื่อคลิกจะแจ้งเตือนให้ copy url ถ้ากด ok จะทำการcopy เพื่อเชิญเพื่อน*/

socket.on("createMessage", (message, userName) => {
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${userName === user ? "me" : userName
    }</span> </b>
        <span>${message}</span>
    </div>`;
}); //บรรทัดนี้จะทำงานต่อเมื่อกดส่งข้อความ โดยจะขึ้นเป็นไอคอลรูปคนแล้วชื่อ user ตามด้วยข้อความที่ส่งไป 