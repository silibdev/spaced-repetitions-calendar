import { Handler, HandlerResponse } from "@netlify/functions";
import { createHandler, createResponse, RequestBody } from '../utils/utils';
import { PhotosRepository } from '../utils/photos.repository';

const handler: Handler = createHandler({
  getResource: getPhotos,
  postResource: postPhotos,
  deleteResource: deletePhoto
})

async function getPhotos(userId: string, {id}: { id: string }): Promise<HandlerResponse> {
  const photos = await PhotosRepository.getPhotos(userId, id);
  return createResponse(photos);
}

async function postPhotos(userId: string, body: RequestBody, {id}: { id: string }): Promise<HandlerResponse> {
  const photos = await PhotosRepository.postPhotos(userId, id, body);
  return createResponse(photos);
}

async function deletePhoto(userId: string, {photoId, id}: {photoId: string, id: string}): Promise<HandlerResponse> {
  const photo = await PhotosRepository.deletePhoto(userId, id, photoId);
  return createResponse(photo);
}

export { handler };
