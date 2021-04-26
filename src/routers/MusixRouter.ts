import "reflect-metadata";

import * as express from "express";
import * as archiver from "archiver";
import * as fs from "fs";
import * as path from "path";

export const musixRouter = express.Router();

/*
=====================================================================================
musixRouter: Middleware Setup
=====================================================================================
*/
//Set static directory
musixRouter.use(express.static(__dirname + "/../../public"));

//Set static directory for music files
let MUSIC_DIR = null;
if (process.platform === "android") {
    MUSIC_DIR = "/storage/3ACD-101B/Music";
} else if (process.platform === "linux") {
    MUSIC_DIR = "/home/assassino/Music";
} else if (process.platform === "win32") {
    MUSIC_DIR = "C:/Users/assassino/Music";
}
musixRouter.use(express.static(MUSIC_DIR));
/*
=====================================================================================
musixRouter: Route Handlers Setup
=====================================================================================
*/
musixRouter.route("/")
    .all((req, res) => {
        if (req.query?.interface === "legacy") {
            res.sendFile(path.resolve(__dirname + "/../../public/layouts/musix/index_legacy.html"));
        } else if (req.query?.interface === "old") {
            res.sendFile(path.resolve(__dirname + "/../../public/layouts/musix/index.html"));
        } else {
            res.sendFile(path.resolve(__dirname + "/../../public/layouts/musix/index2.html"));
        }
    });

musixRouter.route("/playlists")
    .get((req, res) => {
        res.json({
            status: true,
            data: JSON.parse(fs.readFileSync(MUSIC_DIR + "/Registries/playlists.json", "utf-8"))
        });
    })
    .patch(express.json({ limit: 1000000 }), (req, res) => {
        fs.writeFileSync(MUSIC_DIR + "/Registries/playlists.json", JSON.stringify(req.body.playlists, null, "    "));

        res.json({
            status: true
        });
    });
    // .put((req, res) => {
    //     const directoryPath = req.query.directoryPath.toString();

    //     if (!directoryPath.startsWith("/storage/emulated/") && directoryPath.includes("/..")) {
    //         res.json({
    //             status: false,
    //             serverError: {
    //                 message: "For security reasons, specified path isn't allowed. Path must start with '/storage/emulated/'"
    //             }
    //         });
    //     } else {
    //         if (fs.existsSync(directoryPath)) {
    //             if (fs.statSync(directoryPath).isDirectory()) {
    //                 musixRouter.use(express.static(directoryPath));

    //                 const itemNames = fs.readdirSync(directoryPath);

    //                 const playlist = {
    //                     name: directoryPath.slice(directoryPath.lastIndexOf("/") + 1),
    //                     themeColor: "limegreen",
    //                     tracks: []
    //                 };

    //                 for (const itemName of itemNames) {
    //                     const itemExtension = itemName.slice(itemName.lastIndexOf("."));
    //                     if (itemExtension === ".mp3") {
    //                         const track = {
    //                             path: itemName.slice(itemName.lastIndexOf("/") + 1),
    //                             artist: "",
    //                             title: "",
    //                             lyricsURI: null
    //                         };

    //                         playlist.tracks.push(track);
    //                     }
    //                 }

    //                 if (playlist.tracks.length > 0) {
    //                     res.json({
    //                         status: true,
    //                         data: playlist
    //                     });
    //                 } else {
    //                     res.json({
    //                         status: false,
    //                         serverError: {
    //                             message: "No supported items found within the directory"
    //                         }
    //                     });
    //                 }
    //             } else {
    //                 res.json({
    //                     status: false,
    //                     serverError: {
    //                         message: "The specified directory path doesn't point to a directory"
    //                     }
    //                 });
    //             }

    //         } else {
    //             res.json({
    //                 status: false,
    //                 serverError: {
    //                     message: "The specified directory path cannot be found"
    //                 }
    //             });
    //         }
    //     }
    // });

musixRouter.route("/playlists/:playlistIndex")
    .get((req, res) => {
        const playlists = JSON.parse(fs.readFileSync(MUSIC_DIR + "/Registries/playlists.json", "utf-8"));
        const playlistIndex = parseInt(req.params.playlistIndex);

        if (playlistIndex >= playlists.length) {
            res.json({
                status: false,
                serverError: {
                    message: "There is no playlist at the specified index"
                }
            });
        } else {
            const tracks = playlists[playlistIndex].tracks;

            //Setup response
            res.on("close", () => {
                res.end();
            });

            //Setup archive
            const archive = archiver("zip", { store: true });

            archive.on("error", (error) => {
                console.log(error);
                res.json({
                    status: false,
                    serverError: {
                        message: "An error occurred while archiving the playlist"
                    }
                });
            });

            for (const track of tracks) {
                archive.file(`${MUSIC_DIR}/${track.path}`, {
                    name: track.path.slice(track.path.lastIndexOf("/") + 1)
                });
            }

            res.attachment(`${playlists[playlistIndex].name}.zip`).type("zip");
            archive.pipe(res);
            archive.finalize();
        }
    });

musixRouter.route("/playlists/:playlistIndex/tracks/:trackIndex")
    .get((req, res) => {
        const playlists = JSON.parse(fs.readFileSync(MUSIC_DIR + "/Registries/playlists.json", "utf-8"));
        const playlistIndex = parseInt(req.params.playlistIndex);
        const trackIndex = parseInt(req.params.trackIndex);

        if (playlistIndex >= playlists.length) {
            res.json({
                status: false,
                serverError: {
                    message: "There is no playlist at the specified index"
                }
            });
        } else if (trackIndex >= playlists[playlistIndex].tracks.length) {
            res.json({
                status: false,
                serverError: {
                    message: "There is no track at the specified index in the specified playlist"
                }
            });
        } else {
            res.download(`${MUSIC_DIR}/${playlists[playlistIndex].tracks[trackIndex].path}`);
        }
    });

musixRouter.route("/lyrics/:lyricsFileName")
    .get((req, res) => {
        res.sendFile(path.resolve(__dirname + "/../registries/musix/lyrics/" + req.params.lyricsFileName));
    });