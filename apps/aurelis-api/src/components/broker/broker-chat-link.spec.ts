import { Model } from 'mongoose';
import { BrokerService } from './broker.service';
import { OfficeService } from '../office/office.service';
import { BrokerProfile } from '../../libs/dto/broker/broker';
import { MemberRecord } from '../../libs/schemas/Member.model';
import { chatFixture, id } from '../chat/chat-test-fixture';
describe('ADMIN-curated broker chat identity link', () => {
 const input = { name:'Broker',email:'broker@example.com' };
 let exists: jest.Mock;
 let save: jest.Mock;
 let service: BrokerService;
 beforeEach(() => {
  const f = chatFixture(); exists = f.memberModel.exists;
  save = jest.fn().mockReturnValue({exec:()=>Promise.resolve(input)});
  service = new BrokerService({findOneAndUpdate:save} as unknown as Model<BrokerProfile>,{} as OfficeService,f.memberModel as unknown as Model<MemberRecord>);
 });
 it('verifies existence without role mutation and accepts any current role mapping',async()=>{
  await service.upsert({...input,memberId:id(2)}); expect(exists).toHaveBeenCalledWith({_id:id(2)});
  expect(save).toHaveBeenCalledWith({email:input.email},{$set:{...input,memberId:id(2)}},expect.any(Object));
 });
 it('omitted link stays omitted rather than cleared',async()=>{
  await service.upsert(input); expect(exists).not.toHaveBeenCalled(); expect(save).toHaveBeenCalledWith(expect.any(Object),{$set:input},expect.any(Object));
 });
 it.each(['bad',id(99),null])('rejects malformed/null/missing linked identity %s',async memberId=>{
  await expect(service.upsert({...input,memberId} as typeof input & {memberId:string})).rejects.toThrow('Invalid broker member link'); expect(save).not.toHaveBeenCalled();
 });
});
