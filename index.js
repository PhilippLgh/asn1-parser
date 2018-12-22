// https://docs.microsoft.com/en-us/windows/desktop/seccertenroll/about-encoded-tag-bytes
const TAGS = {
  0x01: 'Boolean',
  0x02: 'Integer',
  0x03: 'BitString',
  0x04: 'ObjectString',
  0x05: 'NULL',
  0x06: 'ObjectIdentifier',
  0x30: 'Sequence', // constructed
  0x31: 'Set', // constructed
}


const readByte = (inBuffer, offset) => {
  return inBuffer.readUInt8(offset)
} 

class TLV {
  constructor(inBuffer, rec = true){

    // console.log('try to parse ', inBuffer.length, 'Byte', inBuffer)

    // get (T)ype of (V)alue
    this.T = readByte(inBuffer, 0)
    console.log('T is', '0x'+this.T.toString(16), ' -> ', TAGS[this.T])

    if(!TAGS[this.T]){
      // throw new Error('unknown TAG '+this.T.toString(2))
      console.log('unknown TAG '+this.T.toString(16))
    }

    // get (L)ength of (V)alue 
    this.L = readByte(inBuffer, 1)
    console.log('L is', '0x'+this.L.toString(16), 'dec:'+this.L, 'extened format? '+(this.L > 127))

    this.length = 2
    
    let v_offset = 2

    // https://docs.microsoft.com/en-us/windows/desktop/seccertenroll/about-encoded-length-and-value-bytes
    // If the Value field contains more than 127 bytes, bit 7 of the Length field is one (1)
    // and the remaining bits identify the number of bytes needed to contain the length.
    if(this.L > 127) { // check if bit 7 is set
      let clearMask = ~(1 << 7)
      let L_length = (this.L & clearMask)
      let l_offset = 2 // sizeOf(T) + sizeOf(L)
      console.log('L.length in bytes is', L_length, 'starting at', l_offset)
      this.L = inBuffer.readUIntBE(l_offset, L_length)
      v_offset = l_offset + L_length
      this.length += L_length // add addition L bytes to length
      console.log('->L is', '0x'+this.L.toString(16), 'dec:'+this.L, '0b'+this.L.toString(2))
    } 
    
    // If the Value field contains fewer than 128 bytes, the Length field requires only one byte.
    // Bit 7 of the Length field is zero (0) and the remaining bits identify the number of bytes of content
    // else: nothing to do

    // add Length of V to this length
    this.length += this.L

    this.V = inBuffer.slice(v_offset, v_offset + this.L)
    console.log('V.length :', this.V.length)
    if(this.V.length != this.L){
      throw new Error('V length !== L')
    }

    // is constructed (sequence or set) - scan for contained elements
    if(this.T === 0x30 || this.T === 0x31 || this.T === 0xa0){
      let offset = 0
      while(offset < this.L){
        console.log('search for next struct at', offset)
        let member = new TLV(this.V.slice(offset), false)
        // console.log('member', member)
        offset += member.length
      }
    }

    // console.log('V is ', this.V)

  }
}