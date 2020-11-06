//@ts-check
export class ContextController {
    cardInterface = null;

    view = null;

    constructor(cardInterface, panelView) {
        this.cardInterface = cardInterface;

        this.view = panelView;

        this.view.querySelector("button").addEventListener("click", () => {
            this.hide();
        });

        const panelDivisions = this.view.querySelectorAll(".panelDivision");
        //Add onclick to downloadPlaylistButton for downloading the playlist
        panelDivisions[0].firstElementChild.children[1].addEventListener("click", () => {
            location.href = `/musix/playlists/${panelDivisions[0].dataset.playlistIndex}`;
            this.hide();
        });

        //Add onclick to downloadTrackButton for downloading the track
        panelDivisions[1].firstElementChild.children[1].addEventListener("click", () => {
                location.href = `/musix/playlists/${panelDivisions[1].dataset.playlistIndex}/tracks/${panelDivisions[1].dataset.trackIndex}`;
                this.hide();
        });
        //Add onclick to addToQuickPlaylist button for adding the track to quickPlaylist
        panelDivisions[1].firstElementChild.children[2].addEventListener("click", () => {
            this.cardInterface.getController("playlists").addToQuickPlaylist(this.cardInterface.getController("playlists").getTrackAt({
                trackIndex: panelDivisions[1].dataset.trackIndex,
                playlistIndex: panelDivisions[1].dataset.playlistIndex,
            }));
            this.hide();
        });
    }

    getView() {
        return this.view;
    }

    show() {
        this.view.classList.replace("popOut", "popIn");
    }

    hide() {
        this.view.classList.replace("popIn", "popOut");
    }

    setupPlaylistContext(titleTextContent, playlistIndex) {
        const panelDivisions = this.view.querySelectorAll(".panelDivision");
        panelDivisions[0].style.display = "initial";
        panelDivisions[1].style.display = "none";

        panelDivisions[0].dataset.playlistIndex = playlistIndex;

        panelDivisions[0].firstElementChild.children[0].textContent = titleTextContent;
    }

    setupTrackContext(titleTextContent, trackPosition) {
        const panelDivisions = this.view.querySelectorAll(".panelDivision");
        panelDivisions[0].style.display = "none";
        panelDivisions[1].style.display = "initial";

        panelDivisions[1].dataset.playlistIndex = trackPosition.playlistIndex;
        panelDivisions[1].dataset.trackIndex = trackPosition.trackIndex;

        panelDivisions[1].firstElementChild.children[0].textContent = titleTextContent;
    }
}