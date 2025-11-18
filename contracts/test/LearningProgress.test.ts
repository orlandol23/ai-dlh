import { expect } from "chai";
import { ethers } from "hardhat";
import { LearningProgress } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("LearningProgress", function () {
  let contract: LearningProgress;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const LearningProgress = await ethers.getContractFactory("LearningProgress");
    contract = await LearningProgress.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the right owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should initialize totalCompletions to 0", async function () {
      expect(await contract.totalCompletions()).to.equal(0);
    });
  });

  describe("recordCompletion", function () {
    it("should record module completion successfully", async function () {
      await contract.connect(user1).recordCompletion(1, 85, "TypeScript Basics");

      const progress = await contract.getUserProgress(user1.address);
      expect(progress.length).to.equal(1);
      expect(progress[0].moduleId).to.equal(1);
      expect(progress[0].score).to.equal(85);
      expect(progress[0].moduleTopic).to.equal("TypeScript Basics");
    });

    it("should emit ModuleCompleted event", async function () {
      const tx = await contract.connect(user1).recordCompletion(1, 90, "React Hooks");

      await expect(tx)
        .to.emit(contract, "ModuleCompleted")
        .withArgs(
          user1.address,
          1,
          90,
          await time.latest(),
          "React Hooks"
        );
    });

    it("should increment totalCompletions", async function () {
      await contract.connect(user1).recordCompletion(1, 80, "Module 1");
      expect(await contract.totalCompletions()).to.equal(1);

      await contract.connect(user2).recordCompletion(2, 90, "Module 2");
      expect(await contract.totalCompletions()).to.equal(2);
    });

    it("should reject invalid score (> 100)", async function () {
      await expect(
        contract.connect(user1).recordCompletion(1, 101, "Test")
      ).to.be.revertedWith("Score must be 0-100");
    });

    it("should reject empty topic", async function () {
      await expect(
        contract.connect(user1).recordCompletion(1, 80, "")
      ).to.be.revertedWith("Topic cannot be empty");
    });

    it("should reject invalid module ID (0)", async function () {
      await expect(
        contract.connect(user1).recordCompletion(0, 80, "Test")
      ).to.be.revertedWith("Invalid module ID");
    });

    it("should allow score of 0", async function () {
      await contract.connect(user1).recordCompletion(1, 0, "Failed Module");
      const progress = await contract.getUserProgress(user1.address);
      expect(progress[0].score).to.equal(0);
    });

    it("should allow score of 100", async function () {
      await contract.connect(user1).recordCompletion(1, 100, "Perfect Score");
      const progress = await contract.getUserProgress(user1.address);
      expect(progress[0].score).to.equal(100);
    });

    it("should record multiple completions for same user", async function () {
      await contract.connect(user1).recordCompletion(1, 80, "Module 1");
      await contract.connect(user1).recordCompletion(2, 90, "Module 2");
      await contract.connect(user1).recordCompletion(3, 85, "Module 3");

      const progress = await contract.getUserProgress(user1.address);
      expect(progress.length).to.equal(3);
    });
  });

  describe("getUserProgress", function () {
    it("should return empty array for new user", async function () {
      const progress = await contract.getUserProgress(user1.address);
      expect(progress.length).to.equal(0);
    });

    it("should return all completions for user", async function () {
      await contract.connect(user1).recordCompletion(1, 80, "Module 1");
      await contract.connect(user1).recordCompletion(2, 90, "Module 2");

      const progress = await contract.getUserProgress(user1.address);
      expect(progress.length).to.equal(2);
      expect(progress[0].moduleTopic).to.equal("Module 1");
      expect(progress[1].moduleTopic).to.equal("Module 2");
    });

    it("should keep user progress separate", async function () {
      await contract.connect(user1).recordCompletion(1, 80, "User1 Module");
      await contract.connect(user2).recordCompletion(2, 90, "User2 Module");

      const progress1 = await contract.getUserProgress(user1.address);
      const progress2 = await contract.getUserProgress(user2.address);

      expect(progress1.length).to.equal(1);
      expect(progress2.length).to.equal(1);
      expect(progress1[0].moduleTopic).to.equal("User1 Module");
      expect(progress2[0].moduleTopic).to.equal("User2 Module");
    });
  });

  describe("getUserCompletionCount", function () {
    it("should return 0 for new user", async function () {
      expect(await contract.getUserCompletionCount(user1.address)).to.equal(0);
    });

    it("should return correct count", async function () {
      await contract.connect(user1).recordCompletion(1, 80, "Module 1");
      await contract.connect(user1).recordCompletion(2, 90, "Module 2");
      await contract.connect(user1).recordCompletion(3, 85, "Module 3");

      expect(await contract.getUserCompletionCount(user1.address)).to.equal(3);
    });
  });

  describe("getUserAverageScore", function () {
    it("should return 0 for user with no completions", async function () {
      expect(await contract.getUserAverageScore(user1.address)).to.equal(0);
    });

    it("should calculate correct average", async function () {
      await contract.connect(user1).recordCompletion(1, 80, "Module 1");
      await contract.connect(user1).recordCompletion(2, 90, "Module 2");
      await contract.connect(user1).recordCompletion(3, 70, "Module 3");

      const avg = await contract.getUserAverageScore(user1.address);
      expect(avg).to.equal(80); // (80 + 90 + 70) / 3 = 80
    });

    it("should handle single completion", async function () {
      await contract.connect(user1).recordCompletion(1, 95, "Module 1");
      expect(await contract.getUserAverageScore(user1.address)).to.equal(95);
    });

    it("should round down average", async function () {
      await contract.connect(user1).recordCompletion(1, 80, "Module 1");
      await contract.connect(user1).recordCompletion(2, 85, "Module 2");

      const avg = await contract.getUserAverageScore(user1.address);
      expect(avg).to.equal(82); // (80 + 85) / 2 = 82.5 -> 82
    });
  });

  describe("getUserCompletionByIndex", function () {
    beforeEach(async function () {
      await contract.connect(user1).recordCompletion(1, 80, "Module 1");
      await contract.connect(user1).recordCompletion(2, 90, "Module 2");
    });

    it("should return correct completion by index", async function () {
      const completion = await contract.getUserCompletionByIndex(user1.address, 0);
      expect(completion.moduleId).to.equal(1);
      expect(completion.score).to.equal(80);
      expect(completion.moduleTopic).to.equal("Module 1");
    });

    it("should revert on out of bounds index", async function () {
      await expect(
        contract.getUserCompletionByIndex(user1.address, 10)
      ).to.be.revertedWith("Index out of bounds");
    });
  });

  describe("Gas optimization", function () {
    it("should efficiently handle multiple completions", async function () {
      const promises = [];
      for (let i = 1; i <= 10; i++) {
        promises.push(
          contract.connect(user1).recordCompletion(i, 80 + i, `Module ${i}`)
        );
      }
      await Promise.all(promises);

      const progress = await contract.getUserProgress(user1.address);
      expect(progress.length).to.equal(10);
    });
  });
});
