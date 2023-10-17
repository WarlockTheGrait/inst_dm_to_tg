import "reflect-metadata"

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, DataSource } from "typeorm"

  
// you would have to import / invoke this in another file
export async function openDb () {
    return open({
      filename: '/tmp/database.db',
      driver: sqlite3.Database
    })
  }


  @Entity({name: "users", schema: "public", synchronize: true})
  export class User extends BaseEntity {
      @PrimaryGeneratedColumn()
      id: number;

      //TODO unique constraint
      @Column()
      tgId: number;

      @Column()
      instUserName: string;
      
      @Column()
      state: string;

      @Column({
        type: 'text',
        nullable: true,    
      })
      auth!: string;

      @Column()
      instId: number
    }

  
  export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "file:///../sqlite.db",
    entities: [User]
  }) 

  const initAppDataSource = async () => await AppDataSource.initialize();
  const synchAppDataSource = async () => await AppDataSource.synchronize();
  await initAppDataSource()
  await synchAppDataSource()
   
  console.log("synched");

export async function getUserByTgId(tgId: number) {
  return await AppDataSource.manager.getRepository(User).findOneBy({ tgId: tgId })
}