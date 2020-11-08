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

        //Add onclick to downloadTrackButton for downloading the track
        panelDivisions[1].firstElementChild.children[1].addEventListener("click", () => {
                location.href = `/musix/playlists/${panelDivisions[1].dataset.playlistIndex}/tracks/${panelDivisions[1].dataset.trackIndex}`;
                ContextController.hide();
        });
        //Add onclick to addToQuickPlaylist button for adding the track to quickPlaylist
        panelDivisions[1].firstElementChild.children[2].addEventListener("click", () => {
            ContextController.cardInterface.getController("musicSource").addToQuickPlaylist(ContextController.cardInterface.getController("musicSource").getTrackAt({
                trackIndex: panelDivisions[1].dataset.trackIndex,
                playlistIndex: panelDivisions[1].dataset.playlistIndex,
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