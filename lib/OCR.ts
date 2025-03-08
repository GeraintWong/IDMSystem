import Tesseract from "tesseract.js";

const extractText = async (image: File): Promise<{ name: string; personID: string; dob: string }> => {
    if (!image) throw new Error("No image provided");

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = async () => {
            try {
                const cleanImage = await processImage(reader.result as string);

                const { data } = await Tesseract.recognize(cleanImage, "eng");

                console.log("Raw OCR Text:\n", data.text);

                const name = extractName(data.text);
                const dob = extractDOB(data.text);
                const personID = extractPersonID(data.text);

                resolve({
                    name,
                    personID,
                    dob
                });
            } catch (error) {
                console.error("OCR Error:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };
    });
};

const processImage = async (imageData: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject("Failed to get canvas context");

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Apply preprocessing (e.g., masking top-right area)
            const boxWidth = canvas.width * 0.4;
            const boxHeight = canvas.height * 0.3;
            const xStart = canvas.width - boxWidth;
            ctx.fillStyle = "white";
            ctx.fillRect(xStart, 0, boxWidth, boxHeight);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3; // Grayscale
                data[i] = data[i + 1] = data[i + 2] = avg; // Apply grayscale
            }
            ctx.putImageData(imageData, 0, 0);

            // Apply binarization (thresholding)
            ctx.globalCompositeOperation = "difference";
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";

            const processedImage = canvas.toDataURL();
            resolve(processedImage);
        };

        img.onerror = () => reject("Failed to load image");
        img.src = imageData;
    });
};

const extractName = (text: string): string => {
    const lines = text.split("\n").map(line => line.trim()).filter(line => line);
    let nameStart = false;
    let nameLines: string[] = [];

    for (const line of lines) {
        if (/Undergraduate|STUDENT IDENTITY CARD/i.test(line)) {
            nameStart = true;
            continue;
        }
        if (/Person ID|DOB|Issue No|Expires/i.test(line)) break;
        
        // Allow mixed case names (including lowercase)
        if (/^[A-Za-z\s]+$/.test(line) && !line.includes("UNIVERSITY")) {
            nameLines.push(line);
        }
    }

    let fullName = nameLines.join(" ").trim();
    console.log("Fullname: " + fullName)
    fullName = fullName.replace(/&|\//g, "").replace(/\s+/g, " ");

    return fullName || "Not Found";
};

const extractPersonID = (text: string): string => {
    const personIDPattern = /Person ID:\s*([A-Z0-9-]+)/i;
    const match = text.match(personIDPattern);
    if (match) {
        let id = match[1].trim();
        id = id.replace(/O/g, "0"); // Convert 'O' to '0'
        return id;
    }
    return "Not Found";
};

const extractDOB = (text: string): string => {
    const dobPattern = /DOB:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/;
    const match = text.match(dobPattern);
    return match ? match[1].trim() : "Not Found";
};

// ✅ Correct export statement
export { extractText };
