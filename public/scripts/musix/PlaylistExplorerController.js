//@ts-check
import { PanelController } from "./PanelController.js";

export class PlaylistExplorerController {
    static cardInterface = null;

    static view = null;
    static playlistViewTemplate = null;
    static trackViewTemplate = null;
    static trackContextPanel = document.getElementById("trackContextPanel");
    static draggingTrackPosition = null;

    static init(cardInterface, viewport) {
        PlaylistExplorerController.cardInterface = cardInterface;

        PlaylistExplorerController.view = viewport;
        PlaylistExplorerController.playlistViewTemplate = PlaylistExplorerController.cardInterface.getTemplate(".playlistView");
        PlaylistExplorerController.trackViewTemplate = PlaylistExplorerController.cardInterface.getTemplate(".button.text");

        //Load playlistExplorer
        const playlistViewsFragment = new DocumentFragment();
        for (let i = 0; i < PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylists().length; i++) {
            const playlistView = PlaylistExplorerController.createPlaylistView(i);

            playlistViewsFragment.appendChild(playlistView);
        }
        PlaylistExplorerController.view.appendChild(playlistViewsFragment);
    }

    static createPlaylistView(playlistIndex) {
        const playlist = this.cardInterface.getController("musicSource").getPlaylistAt(playlistIndex);
        const playlistView = PlaylistExplorerController.playlistViewTemplate.cloneNode(true);

        playlistView.firstElementChild.children[0].textContent = playlist.name;
        playlistView.firstElementChild.firstElementChild.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            PanelController.show("#playlistContextPanel", {
                playlistName: playlist.name,
                playlistIndex: playlistIndex
            });
        });

        for (let i = 0; i < playlist.tracks.length; i++) {
            const trackView = PlaylistExplorerController.createTrackView({ playlistIndex: playlistIndex, trackIndex: i });
            playlistView.children[1].appendChild(trackView);
        }

        return playlistView;
    }

    static createTrackView(trackPosition) {
        const track = PlaylistExplorerController.cardInterface.getController("musicSource").getTrackAt(trackPosition);
        const trackView = PlaylistExplorerController.trackViewTemplate.cloneNode(true);
        trackView.style.backgroundColor = PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex).themeColor;

        if (track.title) {
            trackView.textContent = track.title;
        } else {
            trackView.textContent = track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf("."))
        }

        trackView.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        trackView.addEventListener("drop", (event) => {
            const droppingTrackPosition = {
                playlistIndex: Array.from(trackView.parentElement.parentElement.parentElement.children).indexOf(trackView.parentElement.parentElement),
                trackIndex: Array.from(trackView.parentElement.children).indexOf(trackView)
            };

            this.moveTrackView(this.draggingTrackPosition, droppingTrackPosition);

            this.draggingTrackPosition = null;
        });
        trackView.addEventListener("dragstart", (event) => {
            this.draggingTrackPosition = {
                playlistIndex: Array.from(trackView.parentElement.parentElement.parentElement.children).indexOf(trackView.parentElement.parentElement),
                trackIndex: Array.from(trackView.parentElement.children).indexOf(trackView)
            };
        });

        trackView.addEventListener("click", (event) => {
            //NOTE: A trackView's position corresponds to its track position
            //Get the trackView's position within the playlistExplorer
            const playlistIndex = Array.from(trackView.parentElement.parentElement.parentElement.children).indexOf(trackView.parentElement.parentElement);
            const trackIndex = Array.from(trackView.parentElement.children).indexOf(trackView);
            PlaylistExplorerController.cardInterface.getController("playback").loadTrack({ playlistIndex: playlistIndex, trackIndex: trackIndex }, true);
        });
        trackView.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            PanelController.show("#trackContextPanel", {
                playlistName: PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex).name,
                trackTitle: track.title ? track.title : track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf(".")),
                playlistIndex: trackPosition.playlistIndex,
                trackIndex: trackPosition.trackIndex
            });
        });

        return trackView;
    }

    static appendPlaylistView(playlistIndex) {
        const playlistView = PlaylistExplorerController.createPlaylistView(playlistIndex);
        PlaylistExplorerController.view.appendChild(playlistView);
    }

    static appendTrackView(trackPosition) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        const playlistView = PlaylistExplorerController.view.children[trackPosition.playlistIndex];
        const trackView = PlaylistExplorerController.createTrackView(trackPosition);
        playlistView.children[1].appendChild(trackView);
    }

    static removePlaylistView(playlistIndex) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        PlaylistExplorerController.view.children[playlistIndex].remove();
    }

    static removeTrackView(trackPosition) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        //NOTE: Track's index matches its trackView index inside playlistView
        const playlistView = PlaylistExplorerController.view.children[trackPosition.playlistIndex];
        playlistView.children[1].children[trackPosition.trackIndex].remove();

    }

    static moveTrackView(trackPosition, toTrackPosition) {
        //NOTE: A trackView's position corresponds to its track position
        const trackView = PlaylistExplorerController.view.children[trackPosition.playlistIndex].children[1].children[trackPosition.trackIndex];
        const toTrackView = PlaylistExplorerController.view.children[toTrackPosition.playlistIndex].children[1].children[toTrackPosition.trackIndex];
        toTrackView.parentElement.insertBefore(trackView, toTrackView);

        //Update playlists
        this.cardInterface.getController("musicSource").moveTrack(trackPosition, toTrackPosition);
    }

    static search(keyword) {
        keyword = keyword.toLowerCase();
        const playlists = PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylists();
        const trackViewFragment = new DocumentFragment();

        for (let i = 0; i < playlists.length; i++) {
            for (let j = 0; j < playlists[i].tracks.length; j++) {
                if (playlists[i].tracks[j].title.toLowerCase().includes(keyword) || playlists[i].tracks[j].artist.toLowerCase().includes(keyword)) {
                    //Create a trackView and clone it to drop all the event handlers
                    const trackView = PlaylistExplorerController.createTrackView({ playlistIndex: i, trackIndex: j }).cloneNode(true);
                    trackView.draggable = "false";

                    trackView.addEventListener("click", (event) => {
                        PlaylistExplorerController.cardInterface.getController("playback").loadTrack({ playlistIndex: i, trackIndex: j }, true);
                    });

                    trackViewFragment.appendChild(trackView);
                }
            }
        }

        const searchPanel = PanelController.view.querySelector("#searchPanel");
        searchPanel.children[2].innerHTML = "";
        searchPanel.children[2].appendChild(trackViewFragment);
    }
}