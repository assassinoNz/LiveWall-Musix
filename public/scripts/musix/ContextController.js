import { PlaylistExplorerController } from "./PlaylistExplorerController.js";

//@ts-check
export class ContextController {
    static cardInterface = null;

    static view = null;

    static init(cardInterface, panelView) {
        ContextController.cardInterface = cardInterface;

        ContextController.view = panelView;

        ContextController.view.querySelector("button").addEventListener("click", () => {
            ContextController.hide();
        });

        const panelDivisions = ContextController.view.querySelectorAll(".panelDivision");
        //Add onclick to downloadPlaylistButton for downloading the playlist
        panelDivisions[0].firstElementChild.children[1].addEventListener("click", () => {
            location.href = `/musix/playlists/${panelDivisions[0].dataset.playlistIndex}`;
            ContextController.hide();
        });
        //Add onclick to removePlaylistButton for removing the playlist
        panelDivisions[0].firstElementChild.children[2].addEventListener("click", () => {
            const playlistIndex = parseInt(panelDivisions[0].dataset.playlistIndex);
            ContextController.cardInterface.getController("musicSource").removePlaylistAt(playlistIndex);
            PlaylistExplorerController.removePlaylistView(playlistIndex);
            ContextController.hide();
        });
        //Add onclick to continuePlaylistButton for continuing the playlist
        panelDivisions[0].firstElementChild.children[3].addEventListener("click", () => {
            const playlistIndex = parseInt(panelDivisions[0].dataset.playlistIndex);
            PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(playlistIndex));
            if (localStorage.getItem(playlistIndex.toString())) {
                //CASE: The playlist has been played before
                //Continue playlist
                PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(parseInt(localStorage.getItem(playlistIndex.toString())), true);
            } else {
                //CASE: The playlist hasn't been played before
                //PLay from beginning
                PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(0, true);
            }
            ContextController.hide();
        });

        //Add onclick to downloadTrackButton for downloading the track
        panelDivisions[1].firstElementChild.children[1].addEventListener("click", () => {
                location.href = `/musix/playlists/${panelDivisions[1].dataset.playlistIndex}/tracks/${panelDivisions[1].dataset.trackIndex}`;
                ContextController.hide();
        });
        //Add onclick to removeTrack button for removing the track from playlist
        panelDivisions[1].firstElementChild.children[2].addEventListener("click", () => {
            const trackPosition = {
                playlistIndex: parseInt(panelDivisions[1].dataset.playlistIndex),
                trackIndex: parseInt(panelDivisions[1].dataset.trackIndex)
            };
            ContextController.cardInterface.getController("musicSource").removeTrackAt(trackPosition);
            PlaylistExplorerController.removeTrackView(trackPosition);
            ContextController.hide();
        });
        //Add onclick to addToQuickPlaylist button for adding the track to quickPlaylist
        panelDivisions[1].firstElementChild.children[3].addEventListener("click", () => {
            ContextController.cardInterface.getController("musicSource").addToQuickPlaylist(ContextController.cardInterface.getController("musicSource").getTrackAt({
                trackIndex: parseInt(panelDivisions[1].dataset.trackIndex),
                playlistIndex: parseInt(panelDivisions[1].dataset.playlistIndex),
            }));
            ContextController.hide();
        });
    }

    static show() {
        ContextController.view.classList.replace("popOut", "popIn");
    }

    static hide() {
        ContextController.view.classList.replace("popIn", "popOut");
    }

    static setupPlaylistContext(titleTextContent, playlistIndex) {
        const panelDivisions = ContextController.view.querySelectorAll(".panelDivision");
        panelDivisions[0].style.display = "initial";
        panelDivisions[1].style.display = "none";

        panelDivisions[0].dataset.playlistIndex = playlistIndex;

        panelDivisions[0].firstElementChild.children[0].textContent = titleTextContent;
    }

    static setupTrackContext(titleTextContent, trackPosition) {
        const panelDivisions = ContextController.view.querySelectorAll(".panelDivision");
        panelDivisions[0].style.display = "none";
        panelDivisions[1].style.display = "initial";

        panelDivisions[1].dataset.playlistIndex = trackPosition.playlistIndex;
        panelDivisions[1].dataset.trackIndex = trackPosition.trackIndex;

        panelDivisions[1].firstElementChild.children[0].textContent = titleTextContent;
    }
}