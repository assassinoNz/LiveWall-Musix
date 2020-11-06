//@ts-check
export class DirectoryExplorerController {
    cardInterface = null;
    presentWorkingSubdirectoryPath = "/";

    view = null;

    constructor(cardInterface, panelView) {
        this.cardInterface = cardInterface;
        this.view = panelView;

        this.view.querySelector(".buttonContainer>.button").addEventListener("click", () => {
            this.exploreDirectory(this.presentWorkingSubdirectoryPath, true);
        });
    }

    exploreDirectory(subdirectoryPath, backwards = false) {
        if (subdirectoryPath === "/") {
            subdirectoryPath = "";
        }
        if (backwards) {
            subdirectoryPath = subdirectoryPath.slice(0, subdirectoryPath.slice(0, -1).lastIndexOf("/") + 1);
        }
        //Request directory data for the given directory
        fetch(`/liveWall/directories/${encodeURIComponent(this.cardInterface.getRootDirectoryPath()+subdirectoryPath)}/directories`)
        .then(response => response.json())
        .then(response => {
            if (response.status) {
                    this.presentWorkingSubdirectoryPath = subdirectoryPath;
                    this.view.firstElementChild.innerHTML = "";

                    //NOTE: A DocumentFragment is used to improve performance
                    const panelSectorContainerFragment = new DocumentFragment();
                    const panelDivisionSectorTemplate = this.cardInterface.getTemplate(".panelDivisionSector");
                    for (const directory of response.data) {
                        const panelDivisionSector = panelDivisionSectorTemplate.cloneNode(true);
                        panelDivisionSector.textContent = directory.name.slice(0, -1);
                        panelDivisionSector.addEventListener("contextmenu", (event) => {
                            event.preventDefault();
                            this.navigateDirectory(this.presentWorkingSubdirectoryPath + directory.name);
                        });
                        panelDivisionSector.addEventListener("click", (event) => {
                            this.exploreDirectory(this.presentWorkingSubdirectoryPath + directory.name);
                        });
                        panelSectorContainerFragment.appendChild(panelDivisionSector);
                    }

                    this.view.firstElementChild.appendChild(panelSectorContainerFragment);
                } else {
                    if (window.frameElement) {
                        window.parent.shellInterface.throwAlert(response.error.title, response.error.titleDescription, response.error.message, null, "OK", null);
                    } else {
                        alert(response.error.title);
                    }
                }
            });
    }

    navigateDirectory(subdirectoryPath) {
        //Request image data in the given directory
        fetch(`/liveWall/directories/${encodeURIComponent(this.cardInterface.getRootDirectoryPath()+subdirectoryPath)}/images`)
            .then(response => response.json())
            .then(response => {
                if (response.status) {
                    this.cardInterface.setImageMetadata(response.data);
                    //NOTE: LiveWall functionality will be initiated when the user switches to the relevant viewport
                    this.cardInterface.getCarouselController().loadImageAtIndex(0);
                } else {
                    if (window.frameElement) {
                        window.parent.shellInterface.throwAlert(response.error.title, response.error.titleDescription, response.error.message, null, "OK", null);
                    } else {
                        alert(response.error.title);
                    }
                }
            })
    }
}
