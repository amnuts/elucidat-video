import React from 'react';
import {socketapi} from '../socketapi';
import SourcesDialog from './SourcesDialog';
import AppControls from './AppControls';
import AppVideo from './AppVideo';
import {red500} from 'material-ui/styles/colors';
const {desktopCapturer} = window.require('electron');

const styles = {
  panel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems:'center',
    flexWrap: 'wrap',
    position: 'fixed',
    backgroundColor: 'black'
  },
  input: {
    position: 'relative',
    left: 500
  },
  smallvideoContainer: {
    minWidth: '6.25%',
    minHeight: '33.33%',
    overflow: 'hidden'
  },
  smallvideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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
    this.muteVideo = this.muteVideo.bind(this);
    this.unmuteVideo = this.unmuteVideo.bind(this);
    this.handleVideoMuting = this.handleVideoMuting.bind(this);
    // this.handleShareClick = this.handleShareClick.bind(this);
    this.returnShareText = this.returnShareText.bind(this);
    this.toggleScreenshare = this.toggleScreenshare.bind(this);
    this.changeSelected = this.changeSelected.bind(this);
    this.returnSrcObject = this.returnSrcObject.bind(this);
    this.getSize = this.getSize.bind(this);



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
      everyoneMuted: false,
      videoRefs: {}
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
              'local': stream,
              'local2': stream,
              'local3': stream,
              'local4': stream,
              'local5': stream,
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
        let activeStream = this.state.activeStream;
        let selectedStream = this.state.selectedStream;

        if(id === activeStream){
          activeStream = 'local';
        }
        if(id === selectedStream){
          selectedStream = "";
        }
        let streams = { ...this.state.streams};
        delete streams[id];
        this.setState({streams, activeStream, selectedStream});
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
        if(this.state.activeStream !== event.detail){
            this.setState({
              activeStream: event.detail
            });
        }
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
      if(this.state.everyoneMuted){
          this.setState({
            everyoneMuted : false
        });
      }else{
          this.setState({
            everyoneMuted : true
        });
      }
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

  returnSrcObject = () => {
      if(this.state.selectedStream){
          return this.state.streams[this.state.selectedStream]
      }
      return this.state.streams[this.state.activeStream];
  }

  ///////////////// Video stream //////////////////////////////

  changeSelected = (id) => {
    if(this.state.selectedStream === id){
      this.setState({
        selectedStream: ''
      });
    }else{
      this.setState({
        selectedStream: id
      });
    }
  }

  getSize = (size, index) => {
    console.log("GETTING: " +index, size)
    let width = '100%';
    let height = '100%';
    switch (size) {
      case 2:
        width = "50%";
        break;
      case 3:
        if(index > (size/2) && index !== size){
          //bottom row
          width = "100%";
        }else{
          //top row
          width = "50%";
        }
        height = "50%";
        break;
      case 4:
        width = "50%";
        height = "50%";
        break;
      case 5:
       console.log("index: "+ index + " > " + (size/2)+" and size: "+size);
        if(index > (size/2) && index !== size){
          //bottom row
          width = "50%";
        }else{
          //top row
          width = "33.33%";
        }
        height = "50%";
        break;
      case 6:
        width = "33.33%";
        height = "50%";
        break;
      case 7:
        if(index > (size/2) && index !== size){
          //bottom row
          width = "33.33%";
        }else{
          //top row
          width = "25%";
        }
        height = "50%";
        break;
      case 8:
        width = "25%";
        height = "50%";
        break;
      default:
        return {width:'25%'}
    }
    return {height, width};

  }

  returnSmallVideo = (key, index) => {
    let size = Object.keys(this.state.streams).length;
    console.log("INDEX: " +index);
    let hw = this.getSize(size, index);
    let style = {
      ...styles.smallvideoContainer,
      ...hw
    }
    console.log("height", style.height);
    console.log("width", style.width);


    let border = {border: '0px solid #ffffff'}
    if(key === this.state.selectedStream) {
      border = {border: '2px solid', borderColor: red500};
    }else if(key === this.state.activeStream && this.state.selectedStream === ""){
      border = {border: '2px solid #ffffff'};
    }
    let muted = false;
    let volume = 1;
    if(key === 'local' || this.state.everyoneMuted){
        muted = true;
        volume = 0;
    }
    if(this.state.selectedStream !== '' && this.state.slectedStream !== key){
        volume = 0.7;
    }else if (this.state.activeStream !== 'local' && this.state.activeSteam !==key){
        volume = 0.7;
    }
    return (
      <div style={style} key={key}>
        <AppVideo
          onclick={() => this.changeSelected(key)}
          key={key}
          muted={muted}
          srcObject={this.state.streams[key]}
          volume={volume}
          style={styles.smallvideo} />
      </div>

    );
  }

  render() {
    // let width = "100%";
    let height = "100%";
    if(Object.keys(this.state.streams).length > 1){
      height: "50%";
    }
    // if(this.state.streams.length > 2){
    //   let width = "50%";
    // }
    // if(this.state.streams.length > 4){
    //   let width =  parseInt((100/3)) + "%";
    // }
    // if(this.state.streams.length > 6){
    //   let width =  "25%";
    // }
    // if(this.state.streams.length > 8){
    //   let width =  "20%";
    // }
    let style = {
      // width,
      height
    }
    return (
      <div>
        <div style={styles.panel}>
          {Object.keys(this.state.streams).map(this.returnSmallVideo)}
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
            room={this.props.room}
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
