//@ts-check
import { PanelController } from "./PanelController.js";

export class PlaylistExplorerController {
    static cardInterface = null;

    static view = null;
    static playlistViewTemplate = null;
    static trackViewTemplate = null;
    static trackContextPanel = document.getElementById("trackContextPanel");
    static draggingTrackView = null;

    static init(cardInterface, viewport) {
        PlaylistExplorerController.cardInterface = cardInterface;

        PlaylistExplorerController.view = viewport;
        PlaylistExplorerController.playlistViewTemplate = PlaylistExplorerController.cardInterface.getTemplate(".playlistView");
        PlaylistExplorerController.trackViewTemplate = PlaylistExplorerController.cardInterface.getTemplate(".buttonText");

        const playlists = PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylists();
        //Load playlistExplorer
        //NOTE: A DocumentFragment is used to improve performance
        const playlistViewsFragment = new DocumentFragment();
        for (let playlistIndex = 0; playlistIndex < playlists.length; playlistIndex++) {
            const playlistView = PlaylistExplorerController.createPlaylistView(playlists[playlistIndex]);

            playlistViewsFragment.appendChild(playlistView);
        }
        PlaylistExplorerController.view.appendChild(playlistViewsFragment);
    }

    static appendNewPlaylistView(playlist) {
        const playlistView = PlaylistExplorerController.createPlaylistView(playlist);
        PlaylistExplorerController.view.appendChild(playlistView);
    }

    static appendNewTrackView(playlist, trackPosition) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        const playlistView = PlaylistExplorerController.view.children[playlist.index];
        const trackView = PlaylistExplorerController.createTrackView(trackPosition);
        playlistView.children[1].appendChild(trackView);
    }

    static removePlaylistView(playlistIndex) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        PlaylistExplorerController.view.children[playlistIndex].style.display = "none";
    }

    static removeTrackView(trackPosition) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewContainer
        //NOTE: Track's index matches its trackView index inside playlistView
        const playlistView = PlaylistExplorerController.view.children[trackPosition.playlistIndex];
        playlistView.children[1].children[trackPosition.trackIndex].style.display = "none";
    }

    static createPlaylistView(playlist) {
        const playlistView = PlaylistExplorerController.playlistViewTemplate.cloneNode(true);
        playlistView.firstElementChild.children[0].textContent = playlist.name;
        playlistView.dataset.playlistIndex = playlist.index.toString();

        for (let trackIndex = 0; trackIndex < playlist.tracks.length; trackIndex++) {
            const trackView = PlaylistExplorerController.createTrackView({ playlistIndex: playlist.index, trackIndex: trackIndex });
            playlistView.children[1].appendChild(trackView);
        }

        playlistView.firstElementChild.firstElementChild.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            PanelController.show("#playlistContextPanel", {
                playlistName: playlist.name,
                playlistIndex: playlist.index
            });
        });

        return playlistView;
    }

    static createTrackView(trackPosition) {
        const playlists = PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylists();
        const trackView = PlaylistExplorerController.trackViewTemplate.cloneNode(true);
        trackView.dataset.playlistIndex = trackPosition.playlistIndex.toString();
        trackView.dataset.trackIndex = trackPosition.trackIndex.toString();
        trackView.firstElementChild.style.backgroundColor = playlists[trackPosition.playlistIndex].themeColor;

        if (playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title) {
            trackView.firstElementChild.textContent = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title;
        } else {
            const track = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];
            trackView.firstElementChild.textContent = track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf("."))
        }

        trackView.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            const track = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];

            PanelController.show("#trackContextPanel", {
                playlistName: playlists[trackPosition.playlistIndex].name,
                trackTitle: track.title ? track.title : track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf(".")),
                playlistIndex: trackPosition.playlistIndex,
                trackIndex: trackPosition.trackIndex
            });
        });
        trackView.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        trackView.addEventListener("drop", (event) => {
            trackView.parentElement.insertBefore(this.draggingTrackView, trackView);
        });
        trackView.addEventListener("dragstart", (event) => {
            this.draggingTrackView = trackView;
        });

        trackView.firstElementChild.addEventListener("click", (event) => {
            PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex))
            PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(trackPosition.trackIndex, true);
        });

        return trackView;
    }

    static search(keyword) {
        keyword = keyword.toLowerCase();
        const playlists = PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylists();
        const trackViewFragment = new DocumentFragment();

        for (let i = 0; i < playlists.length; i++) {
            for (let j = 0; j < playlists[i].tracks.length; j++) {
                if (playlists[i].tracks[j].title.toLowerCase().includes(keyword) || playlists[i].tracks[j].artist.toLowerCase().includes(keyword)) {
                    const trackView = PlaylistExplorerController.trackViewTemplate.cloneNode(true);
                    trackView.dataset.playlistIndex = i.toString();
                    trackView.dataset.trackIndex = j.toString();
                    trackView.firstElementChild.style.backgroundColor = playlists[i].themeColor;

                    if (playlists[i].tracks[j].title) {
                        trackView.firstElementChild.textContent = playlists[i].tracks[j].title;
                    } else {
                        const track = playlists[i].tracks[j];
                        trackView.firstElementChild.textContent = track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf("."))
                    }

                    trackView.firstElementChild.addEventListener("click", (event) => {
                        PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(i))
                        PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(j, true);
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