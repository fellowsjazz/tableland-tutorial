//metadataProcessing.js

const { NFTStorage, File } = require("nft.storage")
const { getFilesFromPath } = require("files-from-path")
const mime = require("mime")
const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
dotenv.config()

const nftStorageApiKey = process.env.NFT_STORAGE_API_KEY

async function fileFromPath(filePath) {
    const content = await fs.promises.readFile(filePath)   // reads the file at filePath, and stores the result of readFile in content variable 
    const type = mime.getType(filePath)                     //checks the file type of the file at filePath
    return new File([content], path.basename(filePath), {type})  // using the File API, returns a File filled with the content variable
    // path.basename is a path module method, that returns the last portion of a path ( for a file at /russ/test/dog, it would return dog)
    // File uses the File Constructor to create a new File object. a new File takes 3 paramaters, the data or "blob", stored as an array, the file name or path to file
    // and an optional "options" object, with optional attributes like type or lastModified
}

async function uploadImageToIpfs(id, imagesDirPath){      // pass in the id of the image, found in the images directory @ iamgesDirPath.  this is also the images name
    const imagePath = path.join(imagesDirPath, `${id}.jpeg`)  // puts the image directory path and image file path together to create a new path to the specific image
    const image = await fileFromPath(imagePath) //calls the previously created function, and returns a File Api compliant File object, filled with the data of the image

    const storage = new NFTStorage({token: nftStorageApiKey}) // creates a new NFTStorage connection, using our access token stored in .env 
    const imageCid = await storage.storeBlob(image) // use NFT.Storage's "storeBlob" function, which uploads the object, and async returns the CID at which it is stored

    return imageCid  // function returns the Cid stored in image Cid
}

//---------------------------------------
//This function calls the uploadImageToIpfs function, and gets the Cid of the uploaded image. 
//It then reads the pre-generated metadata files in the metadata directory
//It then reads the metadata file, parse it into a JSON, then modifies the image property of the JSON

async function parseMetadataFile(id, metadataDirPath, imagesDirPath) { 
    const imageCid = await uploadImageToIpfs(id, imagesDirPath)  //uploads the ${id}.jpeg at /imagesDirPath/${id}.jpeg to ipfs, and gets the CID once uploaded

    const metadataFilePath = path.join(metadataDirPath, `${id}`) // defines the path to the metadata file

    let metadataFile

    try{
        metadataFile = await fs.promises.readFile(metadataFilePath) // tries to store contents of the metadata file in metadataFile variable
    } catch (error) {
        console.error(`error reading file in metadata directory: ${id}`)
    }

    const metadataJson = JSON.parse(metadataFile.toString()) //makes the metadataFile into a JSON

    metadataJson.image = `https://${imageCid}.ipfs.nftstorage.link/` // sets the metadataJson's image property to an IPFS gateway link for the CID returned when we 
    //uploaded the image to IPFS

    const metadataFileBuffer = Buffer.from(JSON.stringify(metadataJson)) // buffer converts the stringified version of the updated JSON to a stream of binary data
    // for use with the fs.writeFile function

    try {
        await fs.promises.writeFile(metadataFilePath, metadataFileBuffer) // overwrites the metadata file so that we can see the changes 
    } catch (err){
        console.err(`Error writing file in metadata directory: ${id}`)
    }

    return metadataJson // returns the edited metadata JSON object
}

//-----------------------
// This function returns an array of metadata objects, one for each file in the metadata directory
async function prepareMetadata() {
    const finalMetadata = []

    const metadataDirPath = path.join(__dirname, "..", "metadata")     //sets the path for both the metadata folder and images folder, so we can call our other functions
    const imagesDirPath = path.join(__dirname,"..", "images")

    const metadataFiles = await getFilesFromPath(metadataDirPath, {pathPrefix: path.resolve(metadataDirPath)})
    //^^^^^^^^^//
    // in this step, we're using the "getFilesFromPath" function from the files-from-path package, which returns an array of with file-like objects at that path
    // much like other packages and hooks, they use an object for optional settings. pathPrefix strips the base path prefix from the file names in the returned array

    for await (const file of metadataFiles) {  // this is a pretty cool statement - it loops over iterable objects, specifically for async objects (like the one we get from getFilesFromPath)
        let id = file.name.replace(/^\//, "")
        try{
            let metadataObj = await parseMetadataFile(id, metadataDirPath, imagesDirPath) // calling our function to get the metadata object for the file
            metadataObj.id = Number(id) // this essentially makes it so that an error is thrown if the id passed isn't a number (i.e, the name of the metadata file)
            //also sets a new field in our metadataObject called id, which will be used when we're writing SQL
            finalMetadata.push(await metadataObj) // adds our formatted metadata object to our finalMetadata array of objects
        } catch (error){
            console.error(`Error preparing metadata file: ${id}`)
        }
    }
    return finalMetadata
}

module.exports = prepareMetadata




//pick up where you left off, after filling in the blanks! https://docs.tableland.xyz/deploying-an-nft-on-polygon















