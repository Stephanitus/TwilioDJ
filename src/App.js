import React, {Component} from 'react';
import './App.css';
import Titlebar from './Titlebar';
import ActivityFeed from './ActivityFeed';
import SongQueue from './SongQueue';
import SpotifyWebApi from 'spotify-web-api-node';
import SpotifyPlayer from 'react-spotify-web-playback';

class App extends Component{
  constructor(props){
    super(props);
    const params = this.getHashParams();
    const accessToken = params.access_token;
    const refreshToken= params.refresh_token;
    this.state = {
      loggedin: accessToken ? true : false,
      spotifyApi: new SpotifyWebApi(),
      messages: [],
      trackNames: [],
      trackURIs: []
    };
    if(accessToken){
      this.state.spotifyApi.setAccessToken(accessToken);
      this.state.spotifyApi.setRefreshToken(refreshToken);
    }
    this.mergeState = this.mergeState.bind(this);
    this.getState = this.getState.bind(this);
    this.updateMessages = this.updateMessages.bind(this);
    this.updateMessages(.25);
    setInterval(this.updateMessages, 10000, .25);
    this.scrubMessages = this.scrubMessages.bind(this);
    this.getTrackURIs = this.getTrackURIs.bind(this);
    setInterval(this.scrubMessages, 5000);
    setInterval(this.props.mergeState, 5000, {trackURIs: this.state.trackURIs});
  }

  mergeState(partialState){
    Object.assign(this.state, partialState);
  }

  getState(){
    return this.state;
  }

  getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    e = r.exec(q)
    while (e) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
       e = r.exec(q);
    }
    return hashParams;
  }

  updateMessages(daysOld){
    fetch(`/api/messages?days=${daysOld}`, { method: 'GET' })
    .then(res => res.json())
    .then(data => {
      if(data.length > 0){
        this.setState({messages: data.concat(this.state.messages)});
      }
    });
    fetch('api/messages', { method: 'DELETE' })
    .then(res => res.json());
  }

  //Search spotify for matching song
  scrubMessages(){
    var trackNames = (this.state.messages.map(async (input) => {
      return(
        this.state.spotifyApi.searchTracks(`track:${input.body}`)
        .then(data => {
          if(data.body.tracks.items[0]){
            return (data.body.tracks.items[0].name + " - " + data.body.tracks.items[0].artists[0].name);
          }else{
            return "Invalid Song";
          }
        }, err => {}
      ))
      })
    );
    Promise.all(trackNames).then((completed) => this.setState({trackNames: this.sortByPopularity(completed)}));
    this.getTrackURIs();
  }

  getTrackURIs(){
      var trackURIs = (this.state.messages.map(async (track) => {
        return(
          this.state.spotifyApi.searchTracks('track:'+track)
          .then(data => {
            if(data.body.tracks.items[0]){
              return data.body.tracks.items[0].uri;
            }else{
              return "Invalid Song";
            }
          }, err => {}
        ))
      })
    );
    Promise.all(trackURIs).then((completed) => this.setState({trackURIs: this.sortByPopularity(completed)}));
  }

  sortByPopularity(array){
    var count = {};
    array.forEach(uri => count[uri] = (count[uri] || 0) + 1);

    count = Object.entries(count);

    count.sort((a,b) => {
      if (a[1] > b[1]) return -1;
      if (a[1] < b[1]) return 1;
      return 0;
    });
    return count;
  }

  render(){
    if(this.state.loggedin){
      return (
      <div className="App">
        <Titlebar />
          <div className="bgarea">
            <ActivityFeed messages={this.state.messages}/>
            <SongQueue trackNames={this.state.trackNames}/>
            <div className="playbackContainer">
              <SpotifyPlayer
                styles={{
                  color: 'white',
                  bgColor: 'rgba(0,0,0,.6)'
                }}
                token={this.state.spotifyApi.getAccessToken()}
                uris={[this.state.trackURIs]}
              />
            </div>
          </div>
      </div>
      );
    }else{
      return (
        <div className="App">
          <Titlebar />
          <div className="bgarea">
            <div className="login">
              <h1>Please log in with Spotify to use this service!</h1>
              <a href='http://localhost:3001/login'>Login to Spotify</a>
            </div>
          </div>
        </div>
      )
    }
  }
}

export default App;
