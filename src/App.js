import './App.css';
import './styles.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { WelcomePage } from './Components/WelcomePage';
import { VideoCallScreen } from './Components/videoCallScreen';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route exact path="/" element={<WelcomePage />}></Route>
          <Route exact path="/VideoCall/:channelName/:shape" element={<VideoCallScreen />}></Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
