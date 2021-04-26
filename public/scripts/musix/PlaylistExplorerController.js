//@ts-check
import { PanelController } from "./PanelController.js";

export class PlaylistExplorerController {
    static cardInterface = null;

    static view = null;
    static playlistViewTemplate = null;
    static trackViewTemplate = null;
    static trackContextPanel = document.getElementById("trackContextPanel");

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

        trackView.firstElementChild.addEventListener("click", (event) => {
            PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex))
            PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(trackPosition.trackIndex, true);
        });

        trackView.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            const track = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];

            PanelController.show("#trackContextPanel", {
                playlistName: playlists[trackPosition.playlistIndex].name,
                trackTitle: track.title? track.title :  track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf(".")),
                playlistIndex: trackPosition.playlistIndex,
                trackIndex: trackPosition.trackIndex
            });
        });

        return trackView;
    }

    static search(keyword) {
        keyword = keyword.toLowerCase();
        let found = false;

        const panelDivisionSectorItems = document.getElementsByClassName("panelDivisionSectorItem");
        for (let i = 0; i < panelDivisionSectorItems.length; i++) {
            if (panelDivisionSectorItems[i].textContent.toLowerCase().includes(keyword)) {
                panelDivisionSectorItems[i].scrollIntoView();
                PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(parseInt(panelDivisionSectorItems[i].dataset.playlistIndex)));
                PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(parseInt(panelDivisionSectorItems[i].dataset.trackIndex), false);
                found = true;
                break;
            }
        }

        if (!found) {
            if (window.frameElement) {
                window.parent.shellInterface.throwAlert("Oops! We found nothing", "Try words instead of phrases", "We couldn't find a track matching your keyword. Try again with a different keyword", null, "OK", null);
            } else {
                alert("We couldn't find a track matching your keyword. Try again with a different keyword");
            }
        }
    }
}