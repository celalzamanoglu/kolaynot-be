import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './note.schema';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<NoteDocument>) {}

  async findAll(userId: string): Promise<Note[]> {
    return this.noteModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findFavorites(userId: string): Promise<Note[]> {
    return this.noteModel
      .find({ userId, isFavorite: true })
      .sort({ createdAt: -1 });
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.noteModel.findOne({ _id: id, userId });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async updateFavorite(
    id: string,
    updateFavoriteDto: UpdateFavoriteDto,
    userId: string,
  ): Promise<Note> {
    const note = await this.noteModel.findOneAndUpdate(
      { _id: id, userId },
      { isFavorite: updateFavoriteDto.isFavorite },
      { new: true },
    );

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.noteModel.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Note not found');
    }
  }
}
