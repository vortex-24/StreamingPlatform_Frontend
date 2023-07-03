import React from 'react';
import { useState, useEffect } from 'react';
import $, { event } from 'jquery';
import axios from 'axios';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

let options = {
    appId: process.env.REACT_APP_ID,
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

let questionTimer = 0;

// const localContainer = document.createElement('div');
// const remoteContainer = document.createElement('div')


//  <<<<<<<<<<<<<<-------------- React Component ------------->>>>>>>>>>>>>>

export const VideoCallScreen = () => {

    // const { channelName } = useParams();
    const navigate = useNavigate();

    // <--- Agora client implementation --->

    const [isMute, setIsMute] = useState(false);
    const [isVideo, setIsVideo] = useState(true);
    const [recordingUrl, setRecordingUrl] = React.useState();
    const [isRecordingOngoing, setIsRecordingOngoing] = useState(false);


    function agoraClientCreate() {
        agoraEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });        // instance

        isStartTestCalled = true;

        // localContainer.id = options.uid;

        // Set the local video container size
        // localContainer.style.width = "350px";
        // localContainer.style.height = "350px";
        // localContainer.style.position = 'absolute';
        // localContainer.style.right = '0';
        // localContainer.style.top = '5px';
        // localContainer.style.border = '2px solid #f96702';

        // let videoDiv = document.getElementById('video-div');
        // videoDiv.append(localContainer);
        // videoDiv.append(remoteContainer);

        // remoteContainer.style.width = "350px";
        // remoteContainer.style.height = "350px";
        // remoteContainer.style.position = 'absolute';
        // remoteContainer.style.border = '2px solid green';
    }


    useEffect(() => {

        if (isStartTestCalled) {
            agoraEngine.on('user-published', async (user, mediaType) => {
                await agoraEngine.subscribe(user, mediaType);
                console.log('Successfully Subscribed!');

                if (mediaType === 'video') {
                    channelParameters.remoteAudioTrack = user.audioTrack;
                    channelParameters.remoteVideoTrack = user.videoTrack;

                    // remoteContainer.id = user.uid.toString();
                    // remoteContainer.textContent = 'remote user' + remoteContainer.id;
                    // channelParameters.remoteUserId = remoteContainer.id;

                    // let videoDiv = document.getElementById('video-div');
                    // videoDiv.append(remoteContainer);
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

        console.log('Clicked Join!');

        // options.channel = channelName;

        if (options.channel === '') {
            window.alert("Enter the channel name!");
            return;
        }


        // generating token
        await axios.post(process.env.REACT_APP_API_PATH + 'api/authentication/token', { channel: options.channel, userID: options.uid })
            .then((response) => {
                options.token = response.data.generatedToken;
            })
            .catch(err => console.log(err));

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

        navigate('/FeedbackAutoTest');

        // window.location.reload();
    }

    async function handleHostClick() {

        // generating channel

        options.channel = Math.floor(Date.now() / 10).toString();
        // options.channel = '641a8e732bd7a882eb65ca68';
        console.log('channel generated: ', options.channel);

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



    async function handleStartRecordClick()                                   // start recording
    {
        console.log("Start Recording Clicked!");
        await axios.post(process.env.REACT_APP_API_PATH + 'api/recording/start')
            .then((response) => {
                console.log(response)
                setIsRecordingOngoing(true);
            })
            .catch(err => console.log(err));
    }

    async function handleStopRecordClick()                                    // stop recording
    {
        let recordingData;
        console.log("Stop Recording Clicked!");

        let response = await axios.post(process.env.REACT_APP_API_PATH + 'api/recording/stop')

        console.log(response);                                  // getting recording url in response
        setRecordingUrl(response.data.output.recordingFileUrl);
        recordingData = response.data.output.recordingFileUrl;
        setIsRecordingOngoing(false);

        const configuration = {
            method: 'post',
            url: process.env.REACT_APP_API_PATH + 'Results/AutoReview/Recording',
            data: {
                recordingUrl: recordingData
            },
            headers: {
                'x-access-token': localStorage.getItem('token')
            }
        };

        const result = await axios(configuration);
        console.log(result);
        console.log('Recording URL saved successfully');

    }

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

            document.getElementById('remoteDiv').style.display = 'none';

            agoraClientCreate();

            handleJoinClick();

            isJoined = true;
            console.log('here again!');
            // return () => handleLeaveClick();
        }

    }, []);

    // recording implementation end  ----->>>>>>


    const [timer, setTimer] = useState(0);
    const [isTimerStart, setIsTimerStart] = useState(false);

    const [questions, setQuestions] = useState();
    const [index, setIndex] = useState();
    const [singleQues, setSingleQues] = useState();
    const [remark, setRemark] = useState();

    function handleChatClick() {
        $("#videochat-msg").toggleClass("videochat-msg-open");
        $(".usermeetingcall").toggleClass("usermeetingcall-open");

        $(".chatallusermb").removeClass("chatallusermb-open");
        $("#questionalluser").removeClass("videochat-msg-open");
    }

    function handleQuestionClick() {
        $("#questionalluser").toggleClass("videochat-msg-open");
        $(".usermeetingcall").toggleClass("usermeetingcall-open");
        $(".chatallusermb").removeClass("chatallusermb-open");
        $("#videochat-msg").removeClass("videochat-msg-open");
    }

    function handleQuestionBankClick() {
        $("#questionalluser2").toggleClass("videochat-msg-open");
        $(".usermeetingcall").toggleClass("usermeetingcall-open");
        $(".chatallusermb").removeClass("chatallusermb-open");
        $("#videochat-msg").removeClass("videochat-msg-open");
    }



    return (
        <>

            <div className="wrapper flex-wrap" style={{ minHeight: '100vh',background:'#202125' }}>

                {/* <!----------------------------
--------MAIN CONTAINER--------> */}

                <div className="main_container ms-0 w-100">
                   
                {/* <Chatting></Chatting> */}
                    {/* <!------------------------
    -----------Navbar -------> */}
                    <nav className="navbar position-relative border-0 justify-content-center">
                        <div className="navbar_logo">
                            
                        </div>
                        {/* <!-- <div className="search_bar">
            <form action="">
                <input type="text" name="" className="input" required>
                <button type="submit" className="button"><i className="fa fa-search"></i></button>
            </form>
        </div> -->
        <!-- <div className="badge">
            <button className="btn position-relative mb-searchicon"  data-bs-toggle="modal" data-bs-target="#searchModal"><i className="fa fa-search"></i></button>
            <button type="button" className="btn position-relative">
                <i className="fa-solid fa-envelope"></i>
                <span
                    className="bg_red position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    10
                    <span className="visually-hidden"></span>
                </span>
            </button>
            <button type="button" className="btn position-relative">
                <i className="fa-sharp fa-solid fa-bell"></i>
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    10
                    <span className="visually-hidden"></span>
                </span>
            </button>
            <button type="button" className="btn position-relative">
                <img className="proHeader" src="../assets/image/profile.png" />
            </button>
        </div> --> */}
                    </nav>

                    {/* <!-- <div className="back">
        <a href="#"><i className="fa-solid fa-chevron-left"></i> Go Back</a>
        <p>and</p>
    </div> -->

    <!------------------------------
     --------Candidate-Profile------> */}

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
                            {
                                isRecordingOngoing ?
                                    <div className='recordingbtn'>
                                        <i className="fa-solid fa-circle fa-fade px-1" style={{ color: '#ff0000' }}></i>
                                        <span>Recording</span>
                                    </div>
                                    : null
                            }

                            <div id='video-div'>

                                {/* <<<<<------  video streams  ------>>>>> */}


                            </div>

                        </div>
                        <div className="position-absolute videochat-msg" id="videochat-msg">

                        
                                    {/* <div className="chat-user w-100 d-flex align-items-center justify-content-start">
                                        <img src="../assets/image/Profile1.jpg" />
                                        <p className="text-start"><strong className="d-block">Profile</strong> Lorem ipsum dolor sit amet, consectetur adipisicing elit</p>
                                    </div>
                                    <div className="chat-user chat-user2 w-100 d-flex align-items-center justify-content-end">
                                        <p className="text-end"><strong className="d-block">Profile</strong> Lorem ipsum dolor sit amet, consectetur adipisicing elit</p>
                                        <img src="../assets/image/Profile1.jpg" />
                                    </div>
                                    <div className="chat-user w-100 d-flex align-items-center justify-content-start">
                                        <img src="../assets/image/Profile1.jpg" />
                                        <p className="text-start"><strong className="d-block">Profile</strong> Lorem ipsum dolor sit amet, consectetur adipisicing elit</p>
                                    </div>
                                    <div className="chat-user chat-user2 w-100 d-flex align-items-center justify-content-end">
                                        <p className="text-end"><strong className="d-block">Profile</strong> Lorem ipsum dolor sit amet, consectetur adipisicing elit</p>
                                        <img src="../assets/image/Profile1.jpg" />
                                    </div> */}

                               
                            {/* <div className="sendchatmsg d-flex align-items-center">
                                <input type="text" placeholder="Send a message" />
                                <button className="btn">
                                    <img src="../assets/image/send1.png" />
                                </button>
                            </div> */}
                        </div>

                        <div className="position-absolute videochat-msg" id="questionalluser">
                            <div className="chat-question w-100">
                                <div className="w-100 chatheader">
                                    <h3 className="mb-0">Question Bank</h3>
                                </div>

                                {singleQues &&
                                    <>
                                        <div>
                                            <p><strong>{singleQues.question}</strong></p>

                                            <div>
                                                <div>
                                                    <input
                                                        type='radio'
                                                        name='remarks'
                                                        value='Excellent'
                                                        checked={remark === 'Excellent'}
                                                        onChange={() => setRemark('Excellent')}
                                                    />
                                                    <label>Excellent</label>
                                                </div>

                                                <div>
                                                    <input
                                                        type='radio'
                                                        name='remarks'
                                                        value='Satisfactory'
                                                        checked={remark === 'Satisfactory'}
                                                        onChange={() => setRemark('Satisfactory')}
                                                    />
                                                    <label>Satisfactory</label>
                                                </div>

                                                <div>
                                                    <input
                                                        type='radio'
                                                        name='remarks'
                                                        value='Somehow Ok'
                                                        checked={remark === 'Somehow Ok'}
                                                        onChange={() => setRemark('Somehow Ok')}
                                                    />
                                                    <label>Somehow Ok</label>
                                                </div>

                                                <div>
                                                    <input
                                                        type='radio'
                                                        name='remarks'
                                                        value='Poor'
                                                        checked={remark === 'Poor'}
                                                        onChange={() => setRemark('Poor')}
                                                    />
                                                    <label>Poor</label>
                                                </div>

                                                <div>
                                                    <input
                                                        type='radio'
                                                        name='remarks'
                                                        value='Leave'
                                                        checked={remark === 'Leave'}
                                                        onChange={() => setRemark('Leave')}
                                                    />
                                                    <label>Leave</label>
                                                </div>

                                            </div>
                                        </div>
                                    </>
                                }

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
                        </div>




                        <div className="position-absolute videochat-msg" id="questionalluser2">
                            <div className="chat-question w-100">
                                <div className="w-100 chatheader">
                                    <h3 className="mb-0">Question Bank</h3>
                                </div>

                                {singleQues &&
                                    <>
                                        <div>
                                            <div className='questionset'>
                                                <p><strong>{singleQues.question}</strong></p>
                                                <button className='addbtn btn allBtn'>Add</button>
                                            </div>
                                            <p><strong>{singleQues.question}</strong></p>
                                            <p><strong>{singleQues.question}</strong></p>
                                            <p><strong>{singleQues.question}</strong></p>
                                            <p><strong>{singleQues.question}</strong></p>
                                            <p><strong>{singleQues.question}</strong></p>
                                            <p><strong>{singleQues.question}</strong></p>
                                            <p><strong>{singleQues.question}</strong></p>
                                            <p><strong>{singleQues.question}</strong></p>


                                        </div>
                                    </>
                                }

                                <div className="w-100 questionchatbtn">
                                    {/* <div className="w-100">
                                                <button className="submitqiestion" onClick={handleSubmit}>Submit</button>
                                            </div> */}
                                    <div className="d-flex justify-content-between align-items-center w-100">
                                        <button className="btn">Prev</button>
                                        <button className="btn">4</button>
                                        <button className="btn">Next</button>
                                    </div>
                                </div>
                            </div>
                        </div>





                    </div>
                    <div className="row justify-content-between align-items-center pt-3 position-relative meetingbtn">
                        <div className="w-auto d-none d-md-block interview-min">
                            <p className="m-0 teammeeting-text">Auto Interview</p>
                        </div>
                        <div className="w-auto">
                            <div className="d-flex justify-content-center" style={{ gap: '10px' }}>
                                {!isRecordingOngoing ?
                                    <button className="btn rounded-pill videochatstartbtn" onClick={handleStartRecordClick}><i className="fa-solid fa-play"></i></button>
                                    :
                                    <button className="btn rounded-pill videochatstartbtn" onClick={handleStopRecordClick}><i className="fa-solid fa-stop fa-fade"></i></button>
                                }

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
                        <div className="w-auto chatallusermb">
                            <div className="chatalluser">
                                <button className="btn"><i className="fa-solid fa-users text-white"></i>Add User</button>
                                <button className="btn questionmodal-btn" onClick={handleQuestionBankClick}><i className="fa-solid fa-user text-white"></i>Add User</button>
                                <button className="btn chatvideocall" onClick={handleChatClick}><i className="fa-brands fa-rocketchat text-white"></i>Chat</button>
                                <button className="btn questionmodal-btn" onClick={handleQuestionClick}><i className="fa-solid fa-question text-white"></i>Question</button>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
           

        </>
    );
};