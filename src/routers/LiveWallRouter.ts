import "reflect-metadata";

import * as express from "express";
import * as fs from "fs";
import * as path from "path";

export const liveWallRouter = express.Router();
/*
=====================================================================================
liveWallRouter: Middleware Setup
=====================================================================================
*/
//Set static directory
liveWallRouter.use(express.static(__dirname + "/../../public"));
/*
=====================================================================================
liveWallRouter: Route Handlers Setup
=====================================================================================
*/
liveWallRouter.route("/")
    .all((req, res) => {
        res.sendFile(path.resolve(__dirname + "/../../public/layouts/liveWall/index.html"));
    });

liveWallRouter.route("/directories/:absoluteDirectoryPath")
    .put((req, res) => {
        const resolvedPath = path.resolve(req.params.absoluteDirectoryPath) + "/";

        if (fs.existsSync(resolvedPath)) {
            //CASE: Specified directory path exists

            //Merge the specified directory with the current static directory
            //WARNING: This line merges the current static directory with the specified one
            liveWallRouter.use(express.static(resolvedPath));

            res.json({
                status: true
            });
        } else {
            //CASE: Specified directory path doesn't exist
            res.json({
                status: false,
                error: { title: "There's nothing here", titleDescription: "Recheck the path", message: "We couldn't find anything at the path you specified. Make sure that the path is correct and try again", technicalMessage: "Nothing exists at specified path" }
            });
        }
    })

liveWallRouter.route("/directories/:absoluteDirectoryPath/directories")
    .get((req, res) => {
        const resolvedPath = path.resolve(req.params.absoluteDirectoryPath) + "/";
        if (!fs.existsSync(resolvedPath)) {
            res.json({
                status: false,
                error: { title: "There's nothing here", titleDescription: "Recheck the path", message: "We couldn't find anything at the path you specified. Make sure that the path is correct and try again", technicalMessage: "Nothing exists at specified path" }
            });
        } else if (!fs.statSync(resolvedPath).isDirectory()) {
            res.json({
                status: false,
                error: { title: "Path doesn't lead to a directory", titleDescription: "Specify a directory path", message: "Path you specified leads doesn't lead to a directory. Make sure that the path is correct and leads to a directory", technicalMessage: "Cannot find a directory at directory path" }
            });
        } else {
            const itemNames = fs.readdirSync(resolvedPath);
            const directories = [];
            for (const itemName of itemNames) {
                if (fs.statSync(`${resolvedPath}/${itemName}`).isDirectory()) {
                    const directory = {
                        //A "/" will be appended to every directory name as a convention
                        name: itemName + "/",
                    };
                    directories.push(directory);
                }
            }
            if (directories.length > 0) {
                res.json({
                    status: true,
                    data: directories
                });
            } else {
                res.json({
                    status: false,
                    error: { title: "No subdirectories", titleDescription: "Try another directory", message: "Path you specified leads doesn't have any subdirectories. Try another directory path", technicalMessage: "No subdirectories inside directory path" }
                });
            }
        }
    });

liveWallRouter.route("/directories/:absoluteDirectoryPath/images")
    .get((req, res) => {
        const resolvedPath = path.resolve(req.params.absoluteDirectoryPath) + "/";
        if (!fs.existsSync(resolvedPath)) {
            res.json({
                status: false,
                error: { title: "There's nothing here", titleDescription: "Recheck the path", message: "We couldn't find anything at the path you specified. Make sure that the path is correct and try again", technicalMessage: "Nothing exists at specified path" }
            });
        } else if (!fs.statSync(resolvedPath).isDirectory()) {
            res.json({
                status: false,
                error: { title: "Path doesn't lead to a directory", titleDescription: "Specify a directory path", message: "Path you specified leads doesn't lead to a directory. Make sure that the path is correct and leads to a directory", technicalMessage: "Cannot find a directory at directory path" }
            });
        } else {
            const supportedExtensions = [".jpg", ".jpeg", ".png", ".gif"];
            const files = [];

            (function readImagesRecursively(directoryPath) {
                //Read directory
                const itemNames = fs.readdirSync(directoryPath);
                for (let i = 0; i < itemNames.length; i++) {
                    //NOTE: Directory paths contain a "/" at the end. Therefore it should be removed before appending anything
                    const itemPath = `${directoryPath.slice(0, -1)}/${itemNames[i]}`;
                    if (fs.statSync(itemPath).isDirectory()) {
                        //NOTE: Directory paths must contain a "/" at the end
                        readImagesRecursively(itemPath + "/");
                    } else {
                        const fileExtension = itemNames[i].slice(itemNames[i].indexOf(".")).toLowerCase();
                        if (supportedExtensions.includes(fileExtension)) {
                            const file = {
                                path: itemPath
                            };
                            files.push(file);
                        }
                    }
                }
            })(resolvedPath);

            if (files.length > 0) {
                res.json({
                    status: true,
                    data: files
                });
            } else {
                res.json({
                    status: false,
                    error: { title: "Cannot find any images", titleDescription: "Try another directory", message: "Path you specified leads doesn't contain any images supported by the system. Try another directory path", technicalMessage: "No supported images found inside directory path" }
                });
            }
        }
    });
