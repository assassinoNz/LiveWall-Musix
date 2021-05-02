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
                playlistIndex: Array.from(playlistView.parentElement.children).indexOf(playlistView)
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

        trackView.addEventListener("dragstart", (event) => {
            this.draggingTrackPosition = {
                playlistIndex: Array.from(trackView.parentElement.parentElement.parentElement.children).indexOf(trackView.parentElement.parentElement),
                trackIndex: Array.from(trackView.parentElement.children).indexOf(trackView)
            };
        });
        trackView.addEventListener("dragenter", (event) => {
            trackView.classList.add("emphasize");
        });
        trackView.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        trackView.addEventListener("dragleave", (event) => {
            trackView.classList.remove("emphasize");
        });
        trackView.addEventListener("drop", (event) => {
            const musicSourceController = this.cardInterface.getController("musicSource");

            trackView.classList.remove("emphasize");

            //Cache the original track view color
            const draggingPlaylistColor = musicSourceController.getPlaylistAt(this.draggingTrackPosition.playlistIndex).themeColor;

            const removedTrack = musicSourceController.removeTrackAt(this.draggingTrackPosition, true);
            const droppingTrackPosition = {
                playlistIndex: Array.from(trackView.parentElement.parentElement.parentElement.children).indexOf(trackView.parentElement.parentElement),
                trackIndex: Array.from(trackView.parentElement.children).indexOf(trackView)
            };
            musicSourceController.addTrackAt(droppingTrackPosition, removedTrack, true);

            //Re apply the original track view color
            this.view.children[droppingTrackPosition.playlistIndex].children[1].children[droppingTrackPosition.trackIndex].style.backgroundColor = draggingPlaylistColor;

            this.draggingTrackPosition = null;
        });

        trackView.addEventListener("click", (event) => {
            //NOTE: A trackView's position corresponds to its track position
            PlaylistExplorerController.cardInterface.getController("playback").loadTrack({
                playlistIndex: Array.from(trackView.parentElement.parentElement.parentElement.children).indexOf(trackView.parentElement.parentElement),
                trackIndex: Array.from(trackView.parentElement.children).indexOf(trackView)
            }, true);
        });
        trackView.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            PanelController.show("#trackContextPanel", {
                playlistName: PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex).name,
                trackTitle: track.title ? track.title : track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf(".")),
                playlistIndex: Array.from(trackView.parentElement.parentElement.parentElement.children).indexOf(trackView.parentElement.parentElement),
                trackIndex: Array.from(trackView.parentElement.children).indexOf(trackView)
            });
        });

        return trackView;
    }

    static addMissingPlaylistViewForPlaylistAt(playlistIndex) {
        const missingPlaylistView = PlaylistExplorerController.createPlaylistView(playlistIndex);

        if (playlistIndex === this.view.childElementCount) {
            //CASE: playlistPosition is a new position right after the last playlist
            this.view.appendChild(missingPlaylistView);
        } else {
            //CASE: playlistPosition is an existing position
            this.view.insertBefore(missingPlaylistView, this.view.children[playlistIndex]);
        }
    }

    static addMissingTrackViewForTrackAt(trackPosition) {
        const playlistView = PlaylistExplorerController.view.children[trackPosition.playlistIndex];
        const missingTrackView = PlaylistExplorerController.createTrackView(trackPosition);

        if (trackPosition.trackIndex === playlistView.children[1].childElementCount) {
            //CASE: trackPosition is a new position right after the last track
            playlistView.children[1].appendChild(missingTrackView);
        } else {
            //CASE: trackPosition is an existing position
            playlistView.children[1].insertBefore(missingTrackView, playlistView.children[1].children[trackPosition.trackIndex]);
        }
    }

    static removePlaylistViewAt(playlistIndex) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        PlaylistExplorerController.view.children[playlistIndex].remove();
    }

    static removeTrackViewAt(trackPosition) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        //NOTE: Track's index matches its trackView index inside playlistView
        const playlistView = PlaylistExplorerController.view.children[trackPosition.playlistIndex];
        playlistView.children[1].children[trackPosition.trackIndex].remove();
    }
}