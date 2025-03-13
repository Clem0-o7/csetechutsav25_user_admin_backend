const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");

/**
 * Generates a SAS URL for accessing a blob in Azure Storage
 * @param {string} blobUrl - The full URL of the blob stored in user.transactionScreenshot
 * @returns {Promise<string|null>} - The SAS URL or null if there was an error
 */
async function getBlobSasUrl(blobUrl) {
  try {
    // Extract container name and blob name from the full URL
    // Format example: https://clement2004.blob.core.windows.net/techutsav25/payments/1eda513c-0297-4768-8e46-ad5a3d6337ca.png
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    
    // The container name is techutsav25 based on your URL and env variable
    const containerName = process.env.CONTAINERNAME || "techutsav25";
    
    // The blob path includes the "payments" folder
    const blobName = pathParts.slice(2).join('/'); // This will capture "payments/uuid.png"
    
    // Get storage account name - in your case, "clement2004"
    const accountName = "clement2004";
    
    // Use your CONNECTIONKEY environment variable
    const accountKey = process.env.CONNECTIONKEY;

    // Create a StorageSharedKeyCredential
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    // Create permissions for the SAS token (read only)
    const permissions = new BlobSASPermissions();
    permissions.read = true;

    // Set the expiry time (e.g., 1 hour from now)
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1);

    // Generate SAS token
    const sasToken = generateBlobSASQueryParameters({
      containerName,
      blobName,
      permissions,
      startsOn: new Date(),
      expiresOn: expiryTime,
    }, sharedKeyCredential).toString();

    console.log("SAS token:", sasToken);
    // Return the full URL with SAS token
    return `${blobUrl}?${sasToken}`;

  
  } catch (error) {
    console.error("Error generating SAS URL:", error);
    return null;
  }
}

module.exports = { getBlobSasUrl };