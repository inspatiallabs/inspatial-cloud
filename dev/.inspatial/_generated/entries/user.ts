import { Entry } from "#orm";
class User extends Entry {
  name: string = "user";
  get firstName(): string {
    return this._data.get("firstName");
  }
  set firstName(value: string) {
    this._orm.fieldTypes.get("DataField");
    this._data.set("firstName", value);
  }
  get lastName(): string {
    return this._data.get("lastName");
  }
  set lastName(value: string) {
    this._orm.fieldTypes.get("DataField");
    this._data.set("lastName", value);
  }
  get email(): string {
    return this._data.get("email");
  }
  set email(value: string) {
    this._orm.fieldTypes.get("EmailField");
    this._data.set("email", value);
  }
  get password(): string {
    return this._data.get("password");
  }
  set password(value: string) {
    this._orm.fieldTypes.get("PasswordField");
    this._data.set("password", value);
  }
}
export default User;
