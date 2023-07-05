import React, { useCallback } from 'react';
import { useState, useEffect } from 'react';
import $, { event } from 'jquery';
import axios from 'axios';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import * as THREE from 'three';
import { io } from 'socket.io-client';
import debounce from 'lodash.debounce';


let options = {
    appId: "0cb3155dbb5b4fc39ee44d20cf71c377",
    token: '',
    channel: 'streaming-trial',
    uid: 12345678,                      // user id of host
}

let channelParameters = {
    localAudioTrack: null,
    localVideoTrack: null,
    remoteVideoTrack: null,
    remoteAudioTrack: null,
    remoteUserId: null
}

let agoraEngine;
let isStartTestCalled = false;

let isJoined = false;

let localContainer;
let remoteContainer;

let renderingDone = false;

let container;

// const localContainer = document.createElement('div');
// const remoteContainer = document.createElement('div')


//  <<<<<<<<<<<<<<-------------- React Component ------------->>>>>>>>>>>>>>

export const VideoCallScreen = () => {

    const { channelName, shape } = useParams();
    const navigate = useNavigate();

    // <--- Agora client implementation --->

    const [isMute, setIsMute] = useState(false);
    const [isVideo, setIsVideo] = useState(true);

    const [socket, setSocket] = useState(null);
    const [cubeData, setCubeData] = useState({
        position: { x: 0, y: 0, z: -2 },
        rotation: { rotationX: 0, rotationY: 0, rotationZ: 0 },
    });


    function get3DShape(shape) {
        if (shape === 'TorusGeometry') {
            return new THREE.TorusGeometry(1, 0.4, 32, 64);
        // } else if (shape === 'SphereGeometry') {
        //     return new THREE.SphereGeometry(1, 32, 32);
        } else if (shape === 'ConeGeometry') {
            return new THREE.ConeGeometry(1, 2, 32);
        } else if (shape === 'CylinderGeometry') {
            return new THREE.CylinderGeometry(1, 1, 2, 32);
        } else {
            return new THREE.BoxGeometry(1, 1, 1);
        }
    }


    useEffect(() => {
        // Connect to the socket server
        // const socket = io('http://localhost:4300');

        const socket = io('https://streamingbackend.onrender.com', {
            path: "/socket.io",
            transports: ["websocket"],
            secure: true,
          });

        // const socket = io('https://streamingbackend.onrender.com');
        setSocket(socket);

        // Emit a "joinRoom" event
        socket.emit("joinRoom", channelName);


        // Clean up the socket connection
        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        // Receive cube data from other users   ---------->>>>>
        socket.on('cubeData', (data) => {
            if (data !== cubeData) {
                setCubeData(data);
            }
        });

        // Clean up the event listener ---------->>>>>>
        return () => {
            socket.off('cubeData');
        };
    }, [socket]);

    // Debounced version of emitCubeData    ----------->>>>>>
    const emitCubeDataDebounced = useCallback(
        debounce((data) => {
            if (socket) {
                console.log(' data, options.channel----', data, options.channel)
                socket.emit('cubeData', data, options.channel);
            }
        }, 500),
        [socket]
    );

    useEffect(() => {
        // Create the 3D scene
        const scene = new THREE.Scene();

        // Create the cube geometry and material
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        const geometryShape = get3DShape(shape);

        const geometry = geometryShape;
        if (shape === 'ConeGeometry') {
            geometry.rotateX(Math.PI / 2); // Rotate the cone to align with the X-axis
            geometry.translate(0, 1, 0); // Move the cone up along the Y-axis
        }

        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);

        cube.position.set(0, 0, 0);
        cube.scale.set(3, 3, 3);

        // Add the cube to the scene
        scene.add(cube);

        // Render loop function
        const animate = () => {
            // Update cube position and rotation
            cube.position.set(cubeData.position.x, cubeData.position.y, cubeData.position.z);
            cube.rotation.set(
                cubeData.rotation.rotationX,
                cubeData.rotation.rotationY,
                cubeData.rotation.rotationZ
            );

            // Render the scene
            renderer.render(scene, camera);

            // Request the next frame
            requestAnimationFrame(animate);
        };

        // Create the renderer
        const renderer = new THREE.WebGLRenderer();
        // renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setSize(1000, 500);

        container = document.getElementById('3d-container');
        container.appendChild(renderer.domElement);

        // Create the camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        // Start the render loop
        animate();

        // Clean up the renderer
        return () => {
            container.removeChild(renderer.domElement);
        };
    }, [cubeData]);

    const handleMouseDown = useCallback((event) => {
        const mouseDownX = event.clientX;
        const mouseDownY = event.clientY;

        console.log('here today!!!');

        const handleMouseMove = (event) => {
            // const deltaX = event.clientX - mouseDownX;
            // const deltaY = event.clientY - mouseDownY;

            const mouseX = event.clientX;
            const mouseY = event.clientY;

            const windowHalfX = window.innerWidth / 2;
            const windowHalfY = window.innerHeight / 2;
        
            const rotationX = (mouseX - windowHalfX) * 0.002;
            const rotationY = (mouseY - windowHalfY) * 0.002;

            setCubeData((prevCubeData) => {
                // const newCubeData = {
                //     ...prevCubeData,
                //     rotation: {
                //         rotationX: prevCubeData.rotation.rotationX + deltaX * 0.002,
                //         rotationY: prevCubeData.rotation.rotationY + deltaY * 0.002,
                //         rotationZ: prevCubeData.rotation.rotationZ + (deltaX + deltaY) * 0.002,
                //     },
                // };

                const newCubeData = {
                    ...prevCubeData,
                    rotation: {
                        rotationX,
                        rotationY,
                        rotationZ: prevCubeData.rotation.rotationZ,
                    },
                };

                // Debounced emitCubeData with the updated cubeData
                emitCubeDataDebounced(newCubeData);
                return newCubeData;
            });
        };

        const handleMouseUp = () => {
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseup', handleMouseUp);
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseup', handleMouseUp);

    }, [emitCubeDataDebounced]);


    function agoraClientCreate() {
        agoraEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });        // instance

        isStartTestCalled = true;
    }


    useEffect(() => {

        if (isStartTestCalled) {
            agoraEngine.on('user-published', async (user, mediaType) => {
                await agoraEngine.subscribe(user, mediaType);
                console.log('Successfully Subscribed!');

                if (mediaType === 'video') {
                    channelParameters.remoteAudioTrack = user.audioTrack;
                    channelParameters.remoteVideoTrack = user.videoTrack;

                    channelParameters.remoteVideoTrack.play(remoteContainer);

                    document.getElementById('remoteDiv').style.display = '';
                }
                if (mediaType === 'audio') {
                    channelParameters.remoteAudioTrack = user.audioTrack;
                    channelParameters.remoteAudioTrack.play();
                }

                agoraEngine.on('user-unpublished', (user) => {
                    console.log(user.uid + 'left the channel');
                });
            });
        }

    });


    async function handleJoinClick() {

        handleHostClick();

        console.log('Clicked Join!');

        // options.channel = channelName;

        if (options.channel === '') {
            window.alert("Enter the channel name!");
            return;
        }


        // generating token
        await axios.post("https://streamingbackend.onrender.com/" + 'api/authentication/token', { channel: options.channel, userID: options.uid })
            .then((response) => {
                options.token = response.data.generatedToken;
            })
            .catch(err => console.log(err));

        // await axios.post("http://localhost:4300/" + 'api/authentication/token', { channel: options.channel, userID: options.uid })
        //     .then((response) => {
        //         options.token = response.data.generatedToken;
        //     })
        //     .catch(err => console.log(err));

        console.log(options.token, 'token');
        console.log(options.channel, 'channel');


        await agoraEngine.join(options.appId, options.channel, options.token, options.uid);

        try {
            channelParameters.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            channelParameters.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        }
        catch {
            window.alert("no camera found")
        }

        // let videoStreamDiv = document.getElementById('video-div');
        // videoStreamDiv.appendChild(localContainer);

        await agoraEngine.publish([channelParameters.localAudioTrack, channelParameters.localVideoTrack]);
        channelParameters.localVideoTrack.play(localContainer);

        console.log("publish success!");

    }

    async function handleLeaveClick() {
        console.log('Clicked Leave!', channelParameters);

        if (channelParameters.localVideoTrack || channelParameters.localAudioTrack) {
            channelParameters.localAudioTrack.close();
            channelParameters.localVideoTrack.close();
        }

        // removeVideoDiv('local-container');

        await agoraEngine.leave();
        console.log('Left the streaming!');


        Swal.fire({
            title: 'You left the meeting!'
        })

        // window.location.reload();
    }

    async function handleHostClick() {

        // generating channel

        options.channel = channelName;
        options.uid = Math.floor(Date.now() / 10000);
        console.log('uid generated: ', options.uid);

        if (channelParameters.localVideoTrack !== null) {
            await agoraEngine.publish([channelParameters.localAudioTrack, channelParameters.localVideoTrack]);
            console.log('Published successfully');

            channelParameters.localVideoTrack.play(localContainer);
        }
    }


    // remove containers on leaving channel
    function removeVideoDiv(id) {
        console.log("Deleting " + id + " Div");
        const div = document.getElementById(id);
        if (div)
            div.remove();
    };

    // <--- agora client implementation end --->


    function handleMuteAudioClick() {
        console.log(isMute, '***********');

        if (!isMute) {
            if (channelParameters.localAudioTrack)
                channelParameters.localAudioTrack.setMuted(true);            // mute audio
            setIsMute(true);
        }
        else {
            if (channelParameters.localAudioTrack)
                channelParameters.localVideoTrack.setMuted(false);             // unmute audio
            setIsMute(false);
        }
    }

    function handleVideoClick() {
        console.log(isVideo, '$$$$$$$$$');

        if (isVideo) {
            if (channelParameters.localVideoTrack) {
                channelParameters.localVideoTrack.setMuted(true);       // video OFF
            }
            setIsVideo(false);
        }
        else {
            if (channelParameters.localVideoTrack) {
                channelParameters.localVideoTrack.setMuted(false);        // video ON
            }
            setIsVideo(true);
        }
    }


    useEffect(() => {

        if (!isJoined) {
            localContainer = document.getElementById('local-container');
            remoteContainer = document.getElementById('remote-container');

            document.getElementById('remoteDiv').style.display = '';

            agoraClientCreate();

            handleJoinClick();

            isJoined = true;
            console.log('here again!');
            // return () => handleLeaveClick();
        }

    }, []);

    // recording implementation end  ----->>>>>>


    return (
        <>

            <div className="wrapper flex-wrap" style={{ minHeight: '100vh', background: '#202125' }}>

                <div className="main_container ms-0 w-100 text-white">
                    3D Streaming Platform
                </div>

                <div className="container-fluid videochatdiv">
                    <div className="row position-relative overflow-hidden">
                        <div className="col-md-12 usermeetingcall">
                            <div className='container'>
                                <div className='row justify-content-center'>

                                    <div className='col-md-6'>
                                        <div id='local-container' className='w-100' style={{ background: '#222568', height: '350px' }}></div>

                                    </div>
                                    <div id='remoteDiv' className='col-md-6'>
                                        <div id='remote-container' className='w-100' style={{ background: '#222568', height: '350px' }}></div>
                                    </div>
                                </div>
                            </div>

                            <div id='3d-container' onMouseDown={handleMouseDown}>
                                {/* 3D content display  */}
                            </div>

                            <div id='video-div'>

                                {/* <<<<<------  video streams  ------>>>>> */}


                            </div>

                        </div>

                        {/* <div className="position-absolute videochat-msg" id="questionalluser">
                            <div className="chat-question w-100">
                                <div className="w-100 chatheader">
                                    <h3 className="mb-0">Question Bank</h3>
                                </div>

                                <div className="w-100 questionchatbtn">
                                    <div className="w-100">
                                        <button className="submitqiestion">Submit</button>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center w-100">
                                        <button className="btn">Prev</button>
                                        <button className="btn">2</button>
                                        <button className="btn">Next</button>
                                    </div>
                                </div>
                            </div>
                        </div> */}




                        {/* <div className="position-absolute videochat-msg" id="questionalluser2">
                            <div className="chat-question w-100">
                                <div className="w-100 chatheader">
                                    <h3 className="mb-0">Question Bank</h3>
                                </div>

                                <div className="w-100 questionchatbtn">

                                    <div className="d-flex justify-content-between align-items-center w-100">
                                        <button className="btn">Prev</button>
                                        <button className="btn">4</button>
                                        <button className="btn">Next</button>
                                    </div>
                                </div>
                            </div>
                        </div> */}


                    </div>
                    <div className="row justify-content-between align-items-center pt-3 position-relative meetingbtn">
                        <div className="w-auto d-none d-md-block interview-min">
                            <p className="m-0 teammeeting-text">Meeting</p>
                        </div>
                        <div className="w-auto">
                            <div className="d-flex justify-content-center" style={{ gap: '10px' }}>

                                {isMute ?
                                    <button className="btn rounded-pill videochatstartbtn" onClick={handleMuteAudioClick}><i className="fa-solid fa-microphone-slash"></i></button>
                                    :
                                    <button className="btn rounded-pill videochatstartbtn" onClick={handleMuteAudioClick}><i className="fa-solid fa-microphone"></i></button>
                                }

                                {isVideo ?
                                    <button className="btn rounded-pill videochatstartbtn" onClick={handleVideoClick}><i className="fa-solid fa-video"></i></button>
                                    :
                                    <button className="btn rounded-pill videochatstartbtn" onClick={handleVideoClick}><i className="fa-solid fa-video-slash"></i></button>
                                }

                                <button className="btn rounded-pill videochatstartbtn"><i className="fa-solid fa-hand"></i></button>
                                <button className="btn rounded-pill videochatstartbtn moremobilebtn"><i className="fa-solid fa-ellipsis-vertical"></i></button>

                                <button className="btn rounded-pill videochatstartbtn closechatbtn" onClick={handleLeaveClick}><i className="fa-solid fa-phone"></i></button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>


        </>
    );
};