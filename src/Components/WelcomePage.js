import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';


export const WelcomePage = () => {

    const navigate = useNavigate();
    const [channel, setChannel] = useState(null);
    const [selectedOption, setSelectedOption] = useState('BoxGeometery');

    function handleOptionChange(event) {
        setSelectedOption(event.target.value);
    }

    function handleNavigation() {
        if (!channel) {
            window.alert('Channel name is empty!');
        } else {
            navigate(`/VideoCall/${channel}/${selectedOption}`);
        }
    }

    return (
        <div className='welcome-container'>
            <h1 className='my-2 mb-5'>3D Streaming Platform</h1>
            <div className='welcome-box'>

                <h4 style={{textAlign: 'center'}}>Enter channel to get started</h4>
                <input type='text' className='w-100' placeholder='Enter channel here' style={{padding: '3px 9px'}} onChange={(event) => setChannel(event.target.value)}></input>

                <h5>Choose the 3D object you want to interact with</h5>
                <select className="form-select" value={selectedOption} onChange={handleOptionChange}>
                    <option value="BoxGeometry">Cube</option>
                    {/* <option value="SphereGeometry">Sphere</option> */}
                    <option value="CylinderGeometry">Cylinder</option>
                    <option value="ConeGeometry">Cone</option>
                    <option value="TorusGeometry">Torus</option>
                </select>

                <div>
                    <button className='btn btn-primary mt-3 w-100' onClick={handleNavigation}>Join 3D Streaming Platform</button>
                </div>
            </div>

        </div>
    );
};