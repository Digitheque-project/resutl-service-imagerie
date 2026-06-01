import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageClientService } from '../storage-client/storage-client.service';

@Controller('upload-test')
export class UploadTestController {
  constructor(private readonly storageClient: StorageClientService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { error: 'file required' };

    return this.storageClient.uploadFile(file.buffer, file.originalname, file.mimetype);
  }
}
