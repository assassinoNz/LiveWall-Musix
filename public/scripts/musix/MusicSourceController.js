//@ts-check
import { NowPlayingController } from "./NowPlayingController.js";
import { PlaylistExplorerController } from "./PlaylistExplorerController.js";
import { Utility } from "./Utility.js";

export class MusicSourceController {
    cardInterface = null;
    playlists = [];
    quickPlaylistIndex = null;
    offline = false;
    rootDirectoryHandle = null;
    latestTrackUrl = null;

    constructor(cardInterface) {
        this.cardInterface = cardInterface;
    }

    async setOffline(offline) {
        this.offline = offline;
        NowPlayingController.setState("offline", offline);

        if (offline) {
            //CASE: Prepare for offline mode
            if ("socket" in window) {
                //CASE: A socket is already established and is connected
                window.socket.disconnect();
            }

            this.rootDirectoryHandle = await showDirectoryPicker();

            const playlistFileHandle = await (await this.rootDirectoryHandle.getDirectoryHandle("Registries")).getFileHandle("playlists.json");
            const playlistFile = await playlistFileHandle.getFile();
            this.playlists = JSON.parse(await playlistFile.text());

            //Add each playlist's index as field in the playlist
            for (let playlistIndex = 0; playlistIndex < this.playlists.length; playlistIndex++) {
                this.playlists[playlistIndex].index = playlistIndex;
            }

            return true;
        } else {
            //CASE: Prepare for online mode
            if ("socket" in window) {
                //CASE: A socket is already established and is disconnected
                window.socket.connect();
            } else {
                //CASE: No socket established
                //Initialize a new socket with the server
                window.socket = window.io("/musix", { transports: ["websocket"], upgrade: false });

                //Initialize web-socket handlers
                window.socket.on("remote-disable", (params) => {
                    this.cardInterface.getController("playback").setRemotePlay(false);
                });

                window.socket.on("remote-set-volume", (params) => {
                    this.cardInterface.getController("playback").setVolume(params.volume);
                });

                window.socket.on("remote-load-track", (params) => {
                    this.cardInterface.getController("playback").loadTrack(params.trackPosition, params.autoplay);
                });

                window.socket.on("remote-toggle-play", (params) => {
                    this.cardInterface.getController("playback").togglePlay();
                });

                window.socket.on("remote-skip-track", (params) => {
                    this.cardInterface.getController("playback").skipTrack(params.direction);
                });
            }

            this.rootDirectoryHandle = null;
            if (this.latestTrackUrl) {
                URL.revokeObjectURL(this.latestTrackUrl);
            }

            //Request playlist database and playlist metadata
            return fetch("/musix/playlists")
                .then(response => response.json())
                .then(response => {
                    if (response.status) {
                        this.playlists = response.data;
                        //Add each playlist's index as field in the playlist
                        for (let playlistIndex = 0; playlistIndex < this.playlists.length; playlistIndex++) {
                            this.playlists[playlistIndex].index = playlistIndex;
                        }
                    } else if (response.serverError === "network") {
                        // this.cardInterface.getController("nowPlaying").view.querySelector("#lyricsDisplay").innerHTML = "Oops! Something's up with the network connection";
                    } else {
                        alert(response.serverError);
                    }
                });
        }
    }

    isOffline() {
        return this.offline;
    }

    toggleSource() {
        if (this.offline) {
            this.setOffline(false);
        } else {
            this.setOffline(true);
        }
    }

    getPlaylists() {
        return this.playlists;
    }

    getPlaylistAt(playlistIndex) {
        return this.playlists[playlistIndex];
    }

    getTrackAt(trackPosition) {
        return this.playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];
    }

    getQuickPlaylistIndex() {
        return this.quickPlaylistIndex;
    }

    appendPlaylist(newPlaylist) {
        const assignedPlaylistIndex = this.playlists.push(newPlaylist) - 1;
        //Randomize themeColor
        newPlaylist.themeColor = Utility.getRandColor(100, 255);

        //Update UI
        PlaylistExplorerController.appendPlaylistView(assignedPlaylistIndex);

        return assignedPlaylistIndex;
    }

    appendTrackToPlaylist(playlistIndex, track) {
        const assignedTrackIndex = this.playlists[playlistIndex].tracks.push(track) - 1;

        //Update UI
        PlaylistExplorerController.appendTrackView({
            playlistIndex: playlistIndex,
            trackIndex: assignedTrackIndex
        });

        return assignedTrackIndex;
    }

    removePlaylistAt(playlistIndex) {
        this.playlists.splice(playlistIndex, 1);

        const relativeTrackPositions = this.cardInterface.getController("playback").getRelativeTrackPositions();
        
        if (playlistIndex === relativeTrackPositions.current.playlistIndex) {
            //Try to load the first track of the new playlist at currentPlaylistIndex
            if (this.playlists[relativeTrackPositions.current.playlistIndex]) {
                //CASE: There is a new playlist at the currentPlaylistIndex
                //Load its firstTrack
                this.cardInterface.getController("playback").loadTrack({ playlistIndex: relativeTrackPositions.current.playlistIndex, trackIndex: 0 }, false);
            } else {
                //CASE: There is no playlist at the currentPlaylistIndex
                //Load the first track of the first playlist
                this.cardInterface.getController("playback").loadTrack({ playlistIndex: 0, trackIndex: 0 }, false);
            }
        } else if (playlistIndex === relativeTrackPositions.previous.playlistIndex) {
            //CASE: Removed playlist is the relativePreviousPlaylist
            //currentPlaylistIndex becomes the previousPlaylistIndex
            relativeTrackPositions.current.playlistIndex = relativeTrackPositions.previous.playlistIndex;
            //Recalculate the relativePreviousTrack
            relativeTrackPositions.previous = this.queryRelativeTrackPosition(relativeTrackPositions.current, "previous");
        } else if (playlistIndex === relativeTrackPositions.next.playlistIndex) {
            //CASE: Removed playlist is the relativeNextPlaylist
            //Recalculate the relativeNextTrack
            relativeTrackPositions.previous = this.queryRelativeTrackPosition(relativeTrackPositions.current, "next");
        }

        //Update UI
        PlaylistExplorerController.removePlaylistView(playlistIndex);
    }

    removeTrackAt(trackPosition) {
        this.playlists[trackPosition.playlistIndex].tracks.splice(trackPosition.trackIndex, 1);

        const relativeTrackPositions = this.cardInterface.getController("playback").getRelativeTrackPositions();
        if (trackPosition.playlistIndex === relativeTrackPositions.previous.playlistIndex && trackPosition.trackIndex === relativeTrackPositions.previous.trackIndex) {
            //CASE: Removed track is the relativePreviousTrack
            //Current track becomes the previous track
            relativeTrackPositions.current = relativeTrackPositions.previous;
            //Recalculate the relativePreviousTrack
            relativeTrackPositions.previous = this.queryRelativeTrackPosition(relativeTrackPositions.current, "previous");
        } else if (trackPosition.playlistIndex === relativeTrackPositions.current.playlistIndex && trackPosition.trackIndex === relativeTrackPositions.current.trackIndex) {
            //CASE: Removed track is the currentTrack
            //Load the recalculated next track of the previous track
            this.cardInterface.getController("playback").loadTrack(this.queryRelativeTrackPosition(relativeTrackPositions.previous, "next"), false);
        } else if (trackPosition.playlistIndex === relativeTrackPositions.next.playlistIndex && trackPosition.trackIndex === relativeTrackPositions.next.trackIndex) {
            //CASE: Removed track is the relativeNextTrack
            //Recalculate the relativeNextTrack
            relativeTrackPositions.previous = this.queryRelativeTrackPosition(relativeTrackPositions.current, "next");
        }

        //Update UI
        PlaylistExplorerController.removeTrackView(trackPosition);

        //Remove the playlist if all tracks are removed
        if (this.playlists[trackPosition.playlistIndex].tracks.length === 0) {
            this.removePlaylistAt(trackPosition.playlistIndex);
        }
    }

    moveTrack(trackPosition, toTrackPosition) {
        const fromTrack = this.playlists[trackPosition.playlistIndex].tracks.splice(trackPosition.trackIndex, 1)[0];
        this.playlists[toTrackPosition.playlistIndex].tracks.splice(toTrackPosition.trackIndex, 0, fromTrack);
    }

    async determineTrackUrl(trackPosition) {
        if (this.offline) {
            if (this.latestTrackUrl) {
                URL.revokeObjectURL(this.latestTrackUrl);
            }

            const trackPathParts = this.playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].path.split("/");
            const trackFileHandle = await (await this.rootDirectoryHandle.getDirectoryHandle(trackPathParts[0])).getFileHandle(trackPathParts[1]);
            const trackFile = await trackFileHandle.getFile();

            this.latestTrackUrl = URL.createObjectURL(trackFile);
            return this.latestTrackUrl;

        } else {
            return this.playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].path;
        }
    }

    queryRelativePlaylistPosition(playlistIndex, relativity) {
        if (relativity === "next") {
            if (playlistIndex === this.playlists.length) {
                //CASE: Current playlist is the last playlist
                return 0;
            } else {
                //CASE: Current playlist is not the last playlist
                return playlistIndex + 1;
            }
        } else if (relativity === "previous") {
            if (playlistIndex === 0) {
                //CASE: Current playlist is the first playlist
                return this.playlists.length - 1;
            } else {
                //CASE: Current playlist is not the first playlist
                return playlistIndex - 1;
            }
        }
    }

    queryRelativeTrackPosition(trackPosition, relativity) {
        const currentPlaylist = this.playlists[trackPosition.playlistIndex];

        const upcomingTrackPosition = {
            playlistIndex: -1,
            trackIndex: -1
        };

        if (relativity === "next") {
            if (trackPosition.trackIndex === currentPlaylist.tracks.length - 1) {
                //CASE: Now playing is the final track;
                upcomingTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(trackPosition.playlistIndex, relativity);
                upcomingTrackPosition.trackIndex = 0;
            } else {
                //CASE: Now playing is not the final track
                upcomingTrackPosition.playlistIndex = trackPosition.playlistIndex;
                upcomingTrackPosition.trackIndex = trackPosition.trackIndex + 1;
            }
        } else if (relativity === "previous") {
            if (trackPosition.trackIndex === 0) {
                //CASE: Now playing is the first track
                upcomingTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(trackPosition.playlistIndex, relativity);
                upcomingTrackPosition.trackIndex = this.playlists[upcomingTrackPosition.playlistIndex].tracks.length - 1;
            } else {
                //CASE: Now playing is not the first track
                upcomingTrackPosition.playlistIndex = trackPosition.playlistIndex;
                upcomingTrackPosition.trackIndex = trackPosition.trackIndex - 1;
            }
        }

        return upcomingTrackPosition;
    }

    addToQuickPlaylist(track) {
        if (this.quickPlaylistIndex) {
            //CASE: There is a quick playlist created
            //Add the specified track as the last track of the quick playlist
            this.appendTrackToPlaylist(this.quickPlaylistIndex, track);
        } else {
            //CASE: There is no quick playlist created
            //Create the quick playlist in the playlists[]
            const quickPlaylist = {
                name: "Quick ColorBand",
                themeColor: Utility.getRandColor(100, 255),
                tracks: [
                    track
                ]
            };
            this.quickPlaylistIndex = this.appendPlaylist(quickPlaylist);
            //Ask to begin playback of quickPlaylist
            if (window.frameElement) {
                window.parent.shellInterface.throwAlert("Got a question", "Do you want to start QuickPlaylist now?", "Tap YES if you want to start playback of the QuickPlaylist immediately. Otherwise tap on NO", null, "YES", "NO").then(() => {
                    this.cardInterface.getController("playback").loadTrack({ playlistIndex: this.quickPlaylistIndex, trackIndex: 0 }, true);
                }, () => {
                    //Do nothing here
                });
            } else {
                if (confirm("Do you want to start playback of QuickPlaylist now?")) {
                    this.cardInterface.getController("playback").loadTrack({ playlistIndex: this.quickPlaylistIndex, trackIndex: 0 }, true);
                };
            }
        }
    }

    exportPlaylists() {
        if (this.quickPlaylistIndex) {
            //CASE: There is a quick playlist created
            //Remove it
            this.playlists.splice(this.quickPlaylistIndex, 1);
        }

        return fetch("/musix/playlists", {
            method: "PATCH",
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify(this.playlists, null, "    ")
        })
            .then(response => response.json())
            .then(response => {
                return response.status;
            });
    }
}