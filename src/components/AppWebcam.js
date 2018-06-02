import React from 'react';
import {socketapi} from '../socketapi';
import SourcesDialog from './SourcesDialog';
import AppControls from './AppControls';
const {desktopCapturer} = window.require('electron');

const styles = {
  panel: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems:'center',
    flexWrap: 'wrap-reverse',
    position: 'fixed',
    bottom: 0
  },
  input: {
    position: 'relative',
    left: 500
  },
  mainvideo: {
    position:'fixed',
    top:0,
    left:0,
    right:0,
    bottom:0,
    width:'100%',
    height: '100%',
    backgroundColor: 'black'
  },
  smallvideo: {
    maxWidth: '20%',
    objectFit: 'cover',
    maxHeight: 120,
    zIndex: 2,
    overflow: 'hidden',
    minWidth: '12.5%'
  },
  controls: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems:'center',
    flexWrap: 'wrap',
    position: 'fixed',
    width:'100%',
    top: 0
  }
};


export default class AppEditor extends React.Component {

  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.returnSmallVideo = this.returnSmallVideo.bind(this);
    this.returnSmallVideos = this.returnSmallVideos.bind(this);
    this.refVideo = this.refVideo.bind(this);
    this.muteVideo = this.muteVideo.bind(this);
    this.unmuteVideo = this.unmuteVideo.bind(this);
    this.handleVideoMuting = this.handleVideoMuting.bind(this);
    // this.handleShareClick = this.handleShareClick.bind(this);
    this.returnShareText = this.returnShareText.bind(this);
    this.toggleScreenshare = this.toggleScreenshare.bind(this);

    this.state = {
      streams: {},
      streamingVideo: false,
      streamingAudio: false,
      screensharing: false,
      sources: [],
      dialogopen: false,
      videoZoom: 'cover',
      selectedStream: '',
      activeStream: 'local',
      everyoneMuted: false
    };

  }
  
  componentDidMount() {
      if(!this.state.streams.length){
        socketapi.init(this.props.room)
        .then((stream) => {
          console.log("Setting initial stream: ", stream);
          this.setState({
            streams: {
              ...this.state.streams,
              'local': stream
            },
            streamingVideo: true,
            streamingAudio: true
          });
        }).catch((error) => {
          console.log(error.message);
        });
      }

      socketapi.onStreamAdded((event) => {
        console.log("=====Client stream added: ", event.detail);
        let id = event.detail
        let newStream = socketapi.getRemoteStream(id);
        let streams = {
          ...this.state.streams
        };
        streams[id] = newStream;
        this.setState({streams});
      });

      socketapi.onStreamRemoved((event) => {
        console.log("=====Client stream removed: ", event.detail);
        let id = event.detail;
        let streams = { ...this.state.streams};
        delete streams[id];
        this.setState({streams});
      });

      socketapi.onStreamChanged((event) => {
        console.log("=====Client stream changed: ", event.detail);
        let id = event.detail;
        let streams = { ...this.state.streams};
        streams[id] = socketapi.getRemoteStream(id);
        this.setState({streams});
      });

      socketapi.onActiveChange((event) => {
        console.log("======Active Stream change: ", event.detail);
        this.setState({
          activeStream: event.detail
        });
      })

      desktopCapturer.getSources({types: ['window', 'screen'], thumbnailSize:{width:180, height:180}}, (error, sources) => {
          console.log("sources", sources);
        this.setState({
            sources
        });
      });
  }

  handleClick = () => {
    console.log('CLICK');
    if(!this.state.stream){
      navigator.mediaDevices.getUserMedia({video: true})
        .then((stream) =>{
          console.log('PROMISE', stream);
          this.setState({
            stream
          });
        }).catch((error) => {
          console.log(error);
        })
    }
  }
  handleClickStop = () => {
    if(this.state.streams[0]){
      let tracks = this.state.streams[0].getTracks();
      for (var i = 0; i < tracks.length; i++) {
        tracks[i].stop();
      }
      this.setState({
        stream: null
      });
    }
  }

  ///////////////// Video stream //////////////////////////////
  refVideo = (vid, i) => {
      console.log("ref")
    if(!vid) return;
    if(vid.id === '1'){
        console.log("big video")
      //this is the big video
      vid.muted =true;
      if(this.state.selectedStream !== ""){
        vid.srcObject = this.state.streams[this.state.selectedStream];
      }else{
        vid.srcObject = this.state.streams[this.state.activeStream];
      }
    }else{
      //handling small videos
      console.log("ref: ", this.state.streams[i])
      vid.srcObject = this.state.streams[i];
      if(i === 'local'){
        vid.muted = true;
      }
      if(this.state.everyoneMuted){
        vid.muted = true;
      }else if(this.state.selectedStream !== "" && i === this.state.selectedStream){
        // a stream has been selected and its this one
        vid.volume = 1;
      }else if(this.state.selectedStream === "" && this.state.activeStream !== 'local' && this.state.activeStream === i){
        //a stream has not been selected, but the active stream is set and its this one
        vid.volume = 1;
      }else if(this.state.selectedStream === "" && this.state.activeSteam === 'local'){
        // no stream selected or active, give this and all videos volume 1
        vid.volume = 1;
      }else if(this.state.selectedStream !== "" || this.state.activeSteam === 'local'){
        //either a stream has been selected or one is active, but its not this one so volume down a bit
        vid.volume = 0.7;
      }else{
        //something's wrong, default to 1
        vid.volume = 1;
      }
    }

  }

  returnSmallVideo = (key, index) => {
    let size = Object.keys(this.state.streams).length;
    return (
      <video autoPlay id={key} key={key} ref={(vid) => this.refVideo(vid, key)} style={{...styles.smallvideo, width: (size > 5) ? (100 / size) + '%' : '20%'}} />
    );
  }

  returnSmallVideos = () => {
    let videos = [];
    let c = this;
    Object.keys(this.state.streams).forEach(function(key) {
      videos.push(c.returnSmallVideo(key));
    });
    return videos;
  }

///////////// Handle Dialog //////////////
handleOpen = () => {
  this.setState({dialogopen: true});
};

handleClose = () => {
  this.setState({dialogopen: false});
};

toggleScreenshare = () => {
    if(this.state.screensharing){
        socketapi.screenshare(false, null)
          .then((stream) => {
            this.setState({
              streams: {
                ...this.state.streams,
                'local': stream
              },
              screensharing: false
            })
          }).catch(error => {
            console.log(error.message);
          })
    }else{
        //open source select dialog
      desktopCapturer.getSources({types: ['window', 'screen'], thumbnailSize:{width:180, height:180}}, (error, sources) => {
        this.setState({
           sources,
           dialogopen: true
        });
      });
    }
}

///////////// VIDEO MUTING //////////////////////
  muteVideo = () => {
    socketapi.muteVideo();
    this.setState({
      streamingVideo: false
    });
  }
  unmuteVideo = () => {
    socketapi.unmuteVideo();
    this.setState({
      streamingVideo: true
    });
  }
  handleVideoMuting = () => {
    if(this.state.streamingVideo){
      this.muteVideo();
    }else{
      this.unmuteVideo();
    }
  }
  muteAudio = () => {
    socketapi.muteAudio();
    this.setState({
      streamingAudio: false
    });
  }
  unmuteAudio = () => {
    socketapi.unmuteAudio();
    this.setState({
      streamingAudio: true
    });
  }
  handleAudioMuting = () => {
    if(this.state.streamingAudio){
      this.muteAudio();
    }else{
      this.unmuteAudio();
    }
  }
  toggleMuteEveryone = () => {
    this.setState({
      everyoneMuted : !this.state.everyoneMuted
    })
  }

  ///////////////////screensharing////////////////////
  returnShareText = () => {
    if(this.state.screensharing){
      return 'SCREENSHARING ON';
    }else{
      return 'SCREENSHARING OFF';
    }
  }

  selectedSource = (source) => {
    console.log("SELECTED SOURCE: ", source);
    if(!this.state.screensharing){
        this.handleClose();
      socketapi.screenshare(true, source)
        .then((stream) => {
          console.log("screenshare stream: ", stream)
          this.setState({
            streams: {
              ...this.state.streams,
              'local': stream
            },
            screensharing: true,
            dialogopen: false
          })
        }).catch(error => {
          console.log(error.message);
        })
    }else{

    }
  }


  ////////Main video zoom handler //////////
  handleToggleZoom = () => {
    let zoom = (this.state.videoZoom === 'contain') ? 'cover' : 'contain';
    this.setState({
      videoZoom: zoom
    })
  }

  ///////HANGUP////////

  doHangup = () => {
    socketapi.hangup().then(() => {
        console.log("hanging up");
        this.props.onHangup();
    });
  }

  render() {
    return (
      <div>
        <video muted style={{...styles.mainvideo, objectFit: this.state.videoZoom}} onClick={this.handleClickStop} id={1} ref={(vid) => this.refVideo(vid, this.state.activeStream, this.state.selectedStream)} autoPlay/>
        <div style={styles.panel}>
          {Object.keys(this.state.streams).map(this.returnSmallVideo)
          }
        </div>

        <AppControls
            style={styles.controls}
            streamingVideo={this.state.streamingVideo}
            streamingAudio={this.state.streamingAudio}
            onCameraClick={this.handleVideoMuting}
            onMicClick={this.handleAudioMuting}
            isScreenSharing={this.state.screensharing}
            onScreenShareClick={this.toggleScreenshare}
            onToggleZoom={this.handleToggleZoom}
            zoom={this.state.videoZoom}
            everyoneMuted={this.state.everyoneMuted}
            toggleMuteEveryone={this.toggleMuteEveryone}
            onHangup={this.doHangup}
         />

         <SourcesDialog
             open={this.state.dialogopen}
             sources={this.state.sources}
             onSelection={this.selectedSource}
             onRequestClose={this.handleClose}
           />

      </div>
    );
  }
}