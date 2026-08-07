class User:

    def __init__(self, name, city, dream):
        self.name = name
        self.city = city
        self.dream = dream

    def introduce(self):
        print(f"My name is {self.name}.")
        print(f"I live in {self.city}.")
        print(f"My dream is to {self.dream}.")


user = User(
    "Bill",
    "Hyderabad",
    "Build Atlas"
)

user.introduce()